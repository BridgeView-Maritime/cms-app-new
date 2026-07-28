import mongoose from 'mongoose';
import { getMysqlPool } from '../config/mysqlConnection.js';

const BATCH_SIZE = 500;

const toTargetCollectionName = (table) => `collection_${table.trim().toLowerCase()}`;

/**
 * Table/column names can't be parameterized in mysql2 — every identifier
 * that reaches a raw query string below is first checked against a live
 * information_schema lookup so user input can never be interpolated directly.
 */
const assertKnownTable = async (table) => {
  const tables = await listTables();
  const match = tables.find((t) => t.name === table);
  if (!match) {
    throw new Error(`Table "${table}" was not found in the configured MySQL database.`);
  }
  return match;
};

const assertKnownColumn = async (table, column) => {
  const columns = await getColumns(table);
  const match = columns.find((c) => c.name === column);
  if (!match) {
    throw new Error(`Column "${column}" was not found on table "${table}".`);
  }
  return match;
};

export const listTables = async () => {
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    `SELECT TABLE_NAME AS name, TABLE_ROWS AS approxRowCount
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
     ORDER BY TABLE_NAME`,
    [process.env.MYSQL_DATABASE]
  );
  return rows;
};

export const getColumns = async (table) => {
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME AS name, DATA_TYPE AS dataType, COLUMN_KEY AS columnKey
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [process.env.MYSQL_DATABASE, table]
  );
  return rows;
};

export const getPrimaryKeyColumn = async (table) => {
  const columns = await getColumns(table);
  const pk = columns.find((c) => c.columnKey === 'PRI');
  return pk ? pk.name : null;
};

/**
 * Detects foreign-key relationships in both directions so the UI can offer
 * "embed this related table" choices: tables that reference `table` (candidates
 * to embed as nested arrays) and tables `table` itself references (candidates
 * to keep as plain foreign-key values).
 */
export const getRelations = async (table) => {
  await assertKnownTable(table);
  const pool = getMysqlPool();
  const [rows] = await pool.query(
    `SELECT TABLE_NAME AS childTable, COLUMN_NAME AS childColumn,
            REFERENCED_TABLE_NAME AS parentTable, REFERENCED_COLUMN_NAME AS parentColumn
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL
       AND (TABLE_NAME = ? OR REFERENCED_TABLE_NAME = ?)`,
    [process.env.MYSQL_DATABASE, table, table]
  );

  return {
    embeddableChildren: rows
      .filter((r) => r.parentTable === table)
      .map((r) => ({ table: r.childTable, via: r.childColumn })),
    referencedParents: rows
      .filter((r) => r.childTable === table)
      .map((r) => ({ table: r.parentTable, column: r.childColumn, references: r.parentColumn }))
  };
};

export const previewTable = async (table, limit = 10) => {
  await assertKnownTable(table);
  const pool = getMysqlPool();
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const [rows] = await pool.query(`SELECT * FROM \`${table}\` LIMIT ${safeLimit}`);
  const columns = await getColumns(table);
  return { columns, rows };
};

/**
 * Runs a full table transfer: streams the root table in PK-ordered batches,
 * pulls any configured child tables per batch, embeds them, and upserts into
 * MongoDB keyed on the source primary key (_mysqlId) so re-runs are idempotent.
 *
 * `onProgress({ processed, total })` is called after every batch so the
 * caller can push live updates (e.g. over socket.io).
 */
export const runMigration = async ({ rootTable, targetCollection, embed = [] }, { onProgress } = {}) => {
  await assertKnownTable(rootTable);
  const pool = getMysqlPool();
  const pkColumn = await getPrimaryKeyColumn(rootTable);
  if (!pkColumn) {
    throw new Error(`Table "${rootTable}" has no primary key — cannot safely paginate/upsert it.`);
  }

  const validatedEmbeds = [];
  for (const e of embed) {
    await assertKnownTable(e.table);
    await assertKnownColumn(e.table, e.via);
    validatedEmbeds.push({ table: e.table, via: e.via, as: e.as || e.table });
  }

  const collectionName = targetCollection || toTargetCollectionName(rootTable);
  const db = mongoose.connection.db;
  await db.collection(collectionName).createIndex({ _mysqlId: 1 }, { unique: true });

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM \`${rootTable}\``);

  const errors = [];
  let processed = 0;
  let lastPk = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [rows] = lastPk === null
      ? await pool.query(`SELECT * FROM \`${rootTable}\` ORDER BY \`${pkColumn}\` ASC LIMIT ${BATCH_SIZE}`)
      : await pool.query(
          `SELECT * FROM \`${rootTable}\` WHERE \`${pkColumn}\` > ? ORDER BY \`${pkColumn}\` ASC LIMIT ${BATCH_SIZE}`,
          [lastPk]
        );

    if (rows.length === 0) break;

    try {
      const docs = await attachEmbeds(pool, rows, pkColumn, validatedEmbeds);
      const ops = docs.map((doc) => ({
        updateOne: {
          filter: { _mysqlId: doc._mysqlId },
          update: { $set: doc },
          upsert: true
        }
      }));
      await db.collection(collectionName).bulkWrite(ops, { ordered: false });
    } catch (err) {
      errors.push({ batchStartAfter: lastPk, message: err.message });
    }

    processed += rows.length;
    lastPk = rows[rows.length - 1][pkColumn];
    if (onProgress) onProgress({ processed, total });
  }

  return { rootTable, targetCollection: collectionName, total, processed, errors };
};

const attachEmbeds = async (pool, rows, pkColumn, embeds) => {
  const pkValues = rows.map((r) => r[pkColumn]);

  const embedsByRow = new Map(pkValues.map((v) => [v, {}]));
  for (const e of embeds) {
    const placeholders = pkValues.map(() => '?').join(',');
    const [childRows] = await pool.query(
      `SELECT * FROM \`${e.table}\` WHERE \`${e.via}\` IN (${placeholders})`,
      pkValues
    );
    for (const parentId of pkValues) {
      embedsByRow.get(parentId)[e.as] = childRows.filter((c) => c[e.via] === parentId);
    }
  }

  return rows.map((row) => ({
    ...row,
    _mysqlId: row[pkColumn],
    ...embedsByRow.get(row[pkColumn])
  }));
};
