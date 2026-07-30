import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import pkg from 'node-sql-parser';

const { Parser } = pkg;
const parser = new Parser();

const BATCH_SIZE = 500;
const BATCH_TTL_MS = 30 * 60 * 1000; // parsed uploads are only kept around long enough to configure + run a transfer

const parsedBatches = new Map();

const toTargetCollectionName = (table) => `collection_${table.trim().toLowerCase()}`;

const literalToJs = (node) => {
  if (!node) return null;
  switch (node.type) {
    case 'null':
      return null;
    case 'number':
      return typeof node.value === 'string' ? parseFloat(node.value) : node.value;
    case 'bool':
      return Boolean(node.value);
    case 'single_quote_string':
    case 'double_quote_string':
    case 'string':
      return node.value;
    default:
      return node.value ?? null;
  }
};

const DATE_TYPES = new Set(['date', 'datetime', 'timestamp']);
const DECIMAL_TYPES = new Set(['decimal', 'numeric', 'float', 'double']);

const castValue = (value, column) => {
  if (value === null || !column) return value;
  const dataType = column.dataType?.toLowerCase();
  if (dataType === 'tinyint' && column.length === 1) {
    return value === 1 || value === '1';
  }
  if (dataType && DATE_TYPES.has(dataType) && typeof value === 'string') {
    const parsed = new Date(value.replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? value : parsed;
  }
  if (dataType && DECIMAL_TYPES.has(dataType) && typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
};

const getOrCreateTable = (tables, name) => {
  if (!tables.has(name)) {
    tables.set(name, { table: name, columns: [], primaryKey: null, foreignKeys: [], rows: [] });
  }
  return tables.get(name);
};

/**
 * Parses one or more mysqldump/HeidiSQL export files into an in-memory map of
 * table -> { columns, primaryKey, foreignKeys, rows }. No live database connection
 * is involved — this is purely a text-to-structured-data parse of the uploaded SQL.
 */
export const parseDumpFiles = (files) => {
  const tables = new Map();

  for (const file of files) {
    let statements;
    try {
      const asts = parser.astify(file.content, { database: 'MySQL' });
      statements = Array.isArray(asts) ? asts : [asts];
    } catch (err) {
      throw new Error(`Failed to parse "${file.filename}": ${err.message}. Expected a standard mysqldump/HeidiSQL .sql export.`);
    }

    for (const stmt of statements) {
      if (!stmt || Array.isArray(stmt)) continue;

      if (stmt.type === 'create' && stmt.keyword === 'table') {
        const tableName = stmt.table[0].table;
        const entry = getOrCreateTable(tables, tableName);

        entry.columns = stmt.create_definitions
          .filter((d) => d.resource === 'column')
          .map((d) => ({ name: d.column.column, dataType: d.definition.dataType, length: d.definition.length }));

        const pkDef = stmt.create_definitions.find((d) => d.constraint_type === 'primary key');
        entry.primaryKey = pkDef ? pkDef.definition[0].column : null;

        entry.foreignKeys = stmt.create_definitions
          .filter((d) => d.constraint_type === 'FOREIGN KEY')
          .map((d) => ({
            column: d.definition[0].column,
            refTable: d.reference_definition.table[0].table,
            refColumn: d.reference_definition.definition[0].column
          }));
      } else if (stmt.type === 'insert') {
        const tableName = stmt.table[0].table;
        const entry = getOrCreateTable(tables, tableName);

        const columnNames = stmt.columns || (entry.columns.length ? entry.columns.map((c) => c.name) : null);
        if (!columnNames) {
          throw new Error(
            `INSERT into "${tableName}" has no explicit column list and no CREATE TABLE for it was found — cannot determine column order. Include the CREATE TABLE statement in the upload, or export with explicit column lists.`
          );
        }

        const columnMeta = new Map(entry.columns.map((c) => [c.name, c]));

        for (const valueList of stmt.values.values) {
          const rawValues = valueList.value.map(literalToJs);
          const row = {};
          columnNames.forEach((colName, i) => {
            row[colName] = castValue(rawValues[i], columnMeta.get(colName));
          });
          entry.rows.push(row);
        }
      }
    }
  }

  return tables;
};

/**
 * Summarizes a parsed batch for the UI: per table, its columns/PK, a small row
 * sample, and FK-based embed candidates restricted to tables present in this
 * same upload (we have no visibility into tables that weren't uploaded).
 */
export const summarizeBatch = (tables) => {
  const tableNames = new Set(tables.keys());

  return Array.from(tables.values()).map((entry) => {
    const embeddableChildren = [];
    for (const other of tables.values()) {
      if (other.table === entry.table) continue;
      for (const fk of other.foreignKeys) {
        if (fk.refTable === entry.table) {
          embeddableChildren.push({ table: other.table, via: fk.column });
        }
      }
    }

    return {
      table: entry.table,
      columns: entry.columns,
      primaryKey: entry.primaryKey,
      rowCount: entry.rows.length,
      sampleRows: entry.rows.slice(0, 5),
      embeddableChildren,
      referencedParents: entry.foreignKeys.filter((fk) => tableNames.has(fk.refTable))
    };
  });
};

export const saveParsedBatch = (tables) => {
  const batchId = uuidv4();
  const timer = setTimeout(() => parsedBatches.delete(batchId), BATCH_TTL_MS);
  timer.unref?.();
  parsedBatches.set(batchId, { tables, timer });
  return batchId;
};

export const getParsedBatch = (batchId) => {
  const entry = parsedBatches.get(batchId);
  return entry ? entry.tables : null;
};

const attachEmbeds = (rows, pkColumn, embeds, tables) => {
  return rows.map((row) => {
    const doc = { ...row };
    if (pkColumn) doc._mysqlId = row[pkColumn];
    for (const e of embeds) {
      const childEntry = tables.get(e.table);
      doc[e.as] = childEntry.rows.filter((c) => c[e.via] === row[pkColumn]);
    }
    return doc;
  });
};

/**
 * Writes the tables selected in `transfers` from an already-parsed batch into
 * MongoDB. Upserts on _mysqlId (the source primary key) when the table has one,
 * so re-running the same file is idempotent; otherwise falls back to a fresh
 * insert (re-uploading the same dump will then duplicate rows — surfaced to
 * the caller via the returned warning).
 */
export const runMigration = async (batchId, transfers, { onProgress } = {}) => {
  const tables = getParsedBatch(batchId);
  if (!tables) {
    throw new Error('This upload batch has expired or was not found — please re-upload the file(s).');
  }

  const total = transfers.reduce((sum, t) => {
    const entry = tables.get(t.table);
    if (!entry) throw new Error(`Table "${t.table}" was not found in the uploaded batch.`);
    return sum + entry.rows.length;
  }, 0);

  const db = mongoose.connection.db;
  const results = [];
  let processed = 0;

  for (const transfer of transfers) {
    const entry = tables.get(transfer.table);
    const validatedEmbeds = (transfer.embed || []).map((e) => {
      if (!tables.has(e.table)) throw new Error(`Embed table "${e.table}" was not found in the uploaded batch.`);
      return { table: e.table, via: e.via, as: e.as || e.table };
    });

    const collectionName = transfer.targetCollection || toTargetCollectionName(transfer.table);
    const warnings = [];

    if (entry.primaryKey) {
      await db.collection(collectionName).createIndex({ _mysqlId: 1 }, { unique: true });
    } else {
      warnings.push('No primary key detected for this table — rows were inserted fresh; re-running this transfer will create duplicates.');
    }

    for (let i = 0; i < entry.rows.length; i += BATCH_SIZE) {
      const batchRows = entry.rows.slice(i, i + BATCH_SIZE);
      const docs = attachEmbeds(batchRows, entry.primaryKey, validatedEmbeds, tables);

      if (entry.primaryKey) {
        const ops = docs.map((doc) => ({
          updateOne: { filter: { _mysqlId: doc._mysqlId }, update: { $set: doc }, upsert: true }
        }));
        await db.collection(collectionName).bulkWrite(ops, { ordered: false });
      } else {
        await db.collection(collectionName).insertMany(docs, { ordered: false });
      }

      processed += docs.length;
      if (onProgress) onProgress({ processed, total });
    }

    results.push({ table: transfer.table, targetCollection: collectionName, rowCount: entry.rows.length, warnings });
  }

  return { total, processed, tables: results };
};
