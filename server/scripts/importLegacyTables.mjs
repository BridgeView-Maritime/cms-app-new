// Batch form of importLegacyTable.mjs: one pass over a dump, many tables.
//
//   node scripts/importLegacyTables.mjs <db> <table> [<table> ...]
//   node scripts/importLegacyTables.mjs <db> --file tables.txt
//   node scripts/importLegacyTables.mjs <db> --prefix bo_ rank company
//
// --prefix writes to collection_<prefix><table>: for the handful of table
// names that exist in BOTH legacy databases with different contents
// (bridgeoffic.rank is not newshipboard.rank).
//
// Same rules as the single-table script: a collection that already has
// documents is skipped; `_mysqlId` mirrors the primary key; quoted -> string,
// bare -> number, NULL -> null. Tables not found in the dump are reported,
// not fatal, so a mixed list can be pointed at each dump in turn.
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import readline from 'readline';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const BACKUP_DIR = 'C:/Users/Hp/_/.mysql_backup';
const EXTRACT_DIR = 'D:/Bridgeview_Maritime/sql_to_migrate';

const [db, ...rest0] = process.argv.slice(2);
let prefix = '';
const rest = [];
for (let i = 0; i < rest0.length; i++) { if (rest0[i] === '--prefix') prefix = rest0[++i]; else rest.push(rest0[i]); }
let wanted = rest;
if (rest[0] === '--file') wanted = fs.readFileSync(rest[1], 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
if (!db || !wanted.length) {
  console.error('usage: node scripts/importLegacyTables.mjs <db> <table...> | --file <list>');
  process.exit(1);
}
const wantedSet = new Set(wanted);

// ---------------------------------------------------------------------------
// 1. One pass: collect CREATE + INSERT statements for every wanted table.
// ---------------------------------------------------------------------------
const found = new Map(); // table -> { columns, inserts, extract }
let current = null; // table whose CREATE block we are inside

const rl = readline.createInterface({
  input: fs.createReadStream(path.join(BACKUP_DIR, db + '.sql.gz')).pipe(zlib.createGunzip()),
  crlfDelay: Infinity,
});

for await (const line of rl) {
  const create = line.match(/^CREATE TABLE `([a-zA-Z0-9_]+)`/);
  if (create) {
    current = wantedSet.has(create[1]) ? create[1] : null;
    if (current) found.set(current, { columns: [], inserts: [], extract: [line] });
    continue;
  }
  if (current) {
    const rec = found.get(current);
    rec.extract.push(line);
    const t = line.trim();
    if (t.startsWith('`')) rec.columns.push(t.slice(1, t.indexOf('`', 1)));
    if (t.startsWith(')')) current = null;
    continue;
  }
  const ins = line.match(/^INSERT INTO `([a-zA-Z0-9_]+)`/);
  if (ins && found.has(ins[1])) { found.get(ins[1]).inserts.push(line); found.get(ins[1]).extract.push(line); }
}

// ---------------------------------------------------------------------------
// 2. Parser for extended INSERT value lists (identical to the single script).
// ---------------------------------------------------------------------------
const ESCAPES = { n: '\n', r: '\r', t: '\t', '0': '\0', Z: '\x1a', b: '\b' };

function parseRows(statement) {
  const s = statement.slice(statement.indexOf(' VALUES ') + 8);
  const rows = [];
  let i = 0;
  const readValue = () => {
    if (s[i] === "'") {
      i++;
      let out = '';
      while (i < s.length) {
        const ch = s[i];
        if (ch === '\\') { const nx = s[i + 1]; out += Object.prototype.hasOwnProperty.call(ESCAPES, nx) ? ESCAPES[nx] : nx; i += 2; continue; }
        if (ch === "'") { if (s[i + 1] === "'") { out += "'"; i += 2; continue; } i++; return out; }
        out += ch; i++;
      }
      return out;
    }
    let j = i;
    while (j < s.length && s[j] !== ',' && s[j] !== ')') j++;
    const raw = s.slice(i, j).trim();
    i = j;
    if (raw === 'NULL') return null;
    const n = Number(raw);
    return Number.isFinite(n) && raw !== '' ? n : raw;
  };
  while (i < s.length) {
    if (s[i] === '(') {
      i++;
      const row = [];
      for (;;) {
        while (s[i] === ' ') i++;
        row.push(readValue());
        while (s[i] === ' ') i++;
        if (s[i] === ',') { i++; continue; }
        if (s[i] === ')') { i++; break; }
        throw new Error('unexpected char at ' + i + ': ' + JSON.stringify(s.slice(i, i + 20)));
      }
      rows.push(row);
    } else i++;
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 3. Load each table.
// ---------------------------------------------------------------------------
await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
const mdb = mongoose.connection.db;
fs.mkdirSync(path.join(EXTRACT_DIR, db), { recursive: true });

const summary = { imported: [], skipped: [], notFound: [], failed: [] };
let totalDocs = 0;
for (const table of wanted) {
  const rec = found.get(table);
  if (!rec) { summary.notFound.push(table); continue; }
  try {
    fs.writeFileSync(path.join(EXTRACT_DIR, db, prefix + table + '.sql'), rec.extract.join('\n') + '\n');
    const coll = mdb.collection('collection_' + prefix + table);
    const existing = await coll.countDocuments();
    if (existing > 0) { summary.skipped.push(table + '(' + existing + ')'); continue; }

    const docs = [];
    for (const stmt of rec.inserts) {
      for (const row of parseRows(stmt)) {
        const doc = {};
        rec.columns.forEach((c, idx) => { doc[c] = row[idx] === undefined ? null : row[idx]; });
        doc._mysqlId = row[0];
        docs.push(doc);
      }
    }
    for (let k = 0; k < docs.length; k += 2000) await coll.insertMany(docs.slice(k, k + 2000), { ordered: false });
    if (docs.length) await coll.createIndex({ _mysqlId: 1 });
    totalDocs += docs.length;
    summary.imported.push(table + '(' + docs.length + ')');
    console.log('  ' + table.padEnd(32) + String(docs.length).padStart(8) + ' docs  ' + rec.columns.length + ' cols');
  } catch (err) {
    summary.failed.push(table + ': ' + err.message.slice(0, 80));
  }
}

console.log('\nimported ' + summary.imported.length + ' tables, ' + totalDocs.toLocaleString() + ' docs');
if (summary.skipped.length) console.log('skipped (already populated): ' + summary.skipped.join(', '));
if (summary.notFound.length) console.log('not in ' + db + ' dump: ' + summary.notFound.join(', '));
if (summary.failed.length) console.log('FAILED: ' + summary.failed.join(' | '));
await mongoose.disconnect();
