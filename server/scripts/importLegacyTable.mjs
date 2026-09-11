// Imports one table from the legacy cPanel mysqldump into MongoDB as
// `collection_<table>`, matching the convention of the earlier migration
// (`_mysqlId` mirrors the row's primary key; column types are kept as the
// dump has them: quoted -> string, bare -> number, NULL -> null).
//
//   node scripts/importLegacyTable.mjs <db> <table> [--force]
//
// <db> is newshipboard or bridgeoffic. Idempotent: a collection that already
// holds documents is left alone unless --force is passed. The single-table
// .sql extract is also written to D:\Bridgeview_Maritime\sql_to_migrate\<db>\
// so the record of what was migrated stays complete.
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import readline from 'readline';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const BACKUP_DIR = 'C:/Users/Hp/_/.mysql_backup';
const EXTRACT_DIR = 'D:/Bridgeview_Maritime/sql_to_migrate';

const [db, table, flag] = process.argv.slice(2);
if (!db || !table) {
  console.error('usage: node scripts/importLegacyTable.mjs <newshipboard|bridgeoffic> <table> [--force]');
  process.exit(1);
}
const force = flag === '--force';

// ---------------------------------------------------------------------------
// 1. Pull the table's CREATE + INSERT statements out of the gzipped dump.
// ---------------------------------------------------------------------------
const createMarker = 'CREATE TABLE `' + table + '`';
const insertMarker = 'INSERT INTO `' + table + '`';
const dropMarker = 'DROP TABLE IF EXISTS `' + table + '`';

const columns = [];
const inserts = [];
const extractLines = [];
let inCreate = false;

const rl = readline.createInterface({
  input: fs.createReadStream(path.join(BACKUP_DIR, db + '.sql.gz')).pipe(zlib.createGunzip()),
  crlfDelay: Infinity,
});

for await (const line of rl) {
  if (line.startsWith(dropMarker)) { extractLines.push(line); continue; }
  if (line.startsWith(createMarker)) { inCreate = true; extractLines.push(line); continue; }
  if (inCreate) {
    extractLines.push(line);
    const t = line.trim();
    if (t.startsWith('`')) columns.push(t.slice(1, t.indexOf('`', 1)));
    if (t.startsWith(')')) inCreate = false;
    continue;
  }
  if (line.startsWith(insertMarker)) { inserts.push(line); extractLines.push(line); }
}

if (!columns.length) {
  console.error('table ' + table + ' not found in ' + db + '.sql.gz');
  process.exit(1);
}

fs.mkdirSync(path.join(EXTRACT_DIR, db), { recursive: true });
fs.writeFileSync(path.join(EXTRACT_DIR, db, table + '.sql'), extractLines.join('\n') + '\n');

// ---------------------------------------------------------------------------
// 2. Parse the extended INSERT value lists.
// ---------------------------------------------------------------------------
const ESCAPES = { n: '\n', r: '\r', t: '\t', '0': '\0', Z: '\x1a', b: '\b' };

function parseRows(statement) {
  const start = statement.indexOf(' VALUES ');
  const s = statement.slice(start + 8);
  const rows = [];
  let i = 0;

  const readValue = () => {
    if (s[i] === "'") {
      i++;
      let out = '';
      while (i < s.length) {
        const ch = s[i];
        if (ch === '\\') {
          const nx = s[i + 1];
          out += Object.prototype.hasOwnProperty.call(ESCAPES, nx) ? ESCAPES[nx] : nx;
          i += 2;
          continue;
        }
        if (ch === "'") {
          if (s[i + 1] === "'") { out += "'"; i += 2; continue; }
          i++;
          return out;
        }
        out += ch;
        i++;
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
    } else {
      i++;
    }
  }
  return rows;
}

const docs = [];
for (const stmt of inserts) {
  for (const row of parseRows(stmt)) {
    const doc = {};
    columns.forEach((c, idx) => { doc[c] = row[idx] === undefined ? null : row[idx]; });
    doc._mysqlId = row[0];
    docs.push(doc);
  }
}

// ---------------------------------------------------------------------------
// 3. Load.
// ---------------------------------------------------------------------------
await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
const coll = mongoose.connection.db.collection('collection_' + table);

const existing = await coll.countDocuments();
if (existing > 0 && !force) {
  console.log('collection_' + table + ' already has ' + existing + ' docs - skipping (use --force to replace)');
  await mongoose.disconnect();
  process.exit(0);
}
if (existing > 0) {
  await coll.deleteMany({});
  console.log('cleared ' + existing + ' existing docs');
}

if (docs.length) {
  for (let k = 0; k < docs.length; k += 2000) {
    await coll.insertMany(docs.slice(k, k + 2000), { ordered: false });
  }
  await coll.createIndex({ _mysqlId: 1 });
}

console.log(db + '.' + table + ' -> collection_' + table + ': ' + docs.length + ' docs (' + columns.length + ' columns: ' + columns.join(', ') + ')');
await mongoose.disconnect();
