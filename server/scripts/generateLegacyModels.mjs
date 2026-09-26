// Writes a Mongoose model for every migrated legacy collection that does not
// already have one, into server/models/legacy/. Field types are inferred
// from the documents themselves (a column that is always numeric becomes
// Number, always text becomes String, anything else Mixed), so the schema
// describes the data as it actually is, not as the MySQL DDL claimed.
//
//   node scripts/generateLegacyModels.mjs            # write missing models
//   node scripts/generateLegacyModels.mjs --dry-run  # list what would be written
//
// Every model keeps { strict: false } so columns that appear in a handful
// of rows are never silently dropped on save.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = path.join(__dirname, '..', 'models');
const OUT_DIR = path.join(MODELS_DIR, 'legacy');
const dryRun = process.argv.includes('--dry-run');

const pascal = (s) => s.split(/[_\s]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
const safeKey = (k) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : JSON.stringify(k));

// Collections already described by a hand-written model anywhere under models/.
const described = new Set();
const walk = (dir) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { if (p !== OUT_DIR) walk(p); continue; }
    if (!f.endsWith('.js')) continue;
    for (const m of fs.readFileSync(p, 'utf8').matchAll(/collection:\s*'(collection_[a-z0-9_]+)'/g)) described.add(m[1]);
  }
};
walk(MODELS_DIR);

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
const db = mongoose.connection.db;

// Which admin pages read each table - goes into the file header so the next
// person knows what a collection is for without opening the PHP.
const usedBy = new Map();
try {
  const subs = await db.collection('collection_cms_submenu').find({ status: { $in: ['1', 1] } }).toArray();
  const menus = new Map((await db.collection('collection_cms_menu').find({}).toArray()).map((m) => [String(m.menu_id), m.menu_name]));
  const A = 'C:/Users/Hp/_/public_html/bridgeviewmaritime.com/linux/shipmanagementjobs.com/bridgeviewmaritime/admin_Bridgeview/';
  for (const s of subs) {
    const file = A + String(s.page_name || '').split('?')[0];
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, 'latin1');
    for (const m of src.matchAll(/\b(?:from|join|into|update)\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/gi)) {
      const t = 'collection_' + m[1].toLowerCase();
      const label = (menus.get(String(s.menu_id)) || '?') + ' > ' + s.submenu_name;
      if (!usedBy.has(t)) usedBy.set(t, new Set());
      usedBy.get(t).add(label);
    }
  }
} catch {
  // Legacy page source not available on this machine - headers just omit it.
}

// The CMS's own dynamic-engine data also lives in collection_<form_code>;
// those are not legacy tables and get no model here.
const formCodes = new Set((await db.collection('formmetas').find({}, { projection: { form_code: 1 } }).toArray()).map((f) => 'collection_' + String(f.form_code).toLowerCase()));
const names = (await db.listCollections().toArray()).map((c) => c.name).filter((n) => n.startsWith('collection_') && !formCodes.has(n)).sort();
const todo = [];
for (const n of names) {
  if (described.has(n)) continue;
  if ((await db.collection(n).estimatedDocumentCount()) === 0) continue; // nothing to infer from
  todo.push(n);
}
console.log(names.length + ' legacy collections, ' + described.size + ' already modelled, ' + todo.length + ' to generate' + (dryRun ? ' (dry run)' : ''));
if (!dryRun) fs.mkdirSync(OUT_DIR, { recursive: true });

const generated = [];
// Windows compares filenames case-insensitively, so two tables whose Pascal
// forms differ only by case would overwrite each other. Refuse instead.
const seenLower = new Set();
for (const coll of todo) {
  const table = coll.slice('collection_'.length);
  const sample = await db.collection(coll).aggregate([{ $sample: { size: 500 } }]).toArray();
  // Column order from the first document (insertion order = MySQL column order).
  const first = await db.collection(coll).findOne({});
  const keys = first ? Object.keys(first).filter((k) => k !== '_id' && k !== '_mysqlId') : [];

  const kinds = new Map();
  for (const doc of sample) {
    for (const [k, v] of Object.entries(doc)) {
      if (k === '_id' || k === '_mysqlId') continue;
      if (!keys.includes(k)) keys.push(k);
      if (v === null || v === undefined || v === '') continue;
      const kind = typeof v === 'number' ? 'number' : typeof v === 'string' ? 'string' : 'other';
      kinds.set(k, (kinds.get(k) || new Set()).add(kind));
    }
  }
  const typeOf = (k) => {
    const s = kinds.get(k);
    if (!s || s.size === 0) return 'String';            // never populated: keep it text
    if (s.size === 1 && s.has('number')) return 'Number';
    if (s.size === 1 && s.has('string')) return 'String';
    return 'mongoose.Schema.Types.Mixed';
  };

  const modelName = 'Legacy' + pascal(table);
  if (seenLower.has(modelName.toLowerCase())) { console.error('name collision on ' + modelName + ' (' + table + ') - rename one table mapping'); process.exit(1); }
  seenLower.add(modelName.toLowerCase());
  const users = [...(usedBy.get(coll) || [])].sort();
  const header = [
    "import mongoose from 'mongoose';",
    '',
    '// Legacy MySQL table `' + table + '`, migrated as-is into ' + coll + '.',
    '// Generated by scripts/generateLegacyModels.mjs from the migrated data;',
    '// types reflect what the rows actually hold (Mixed = both text and numbers',
    '// occur). Edit freely - the generator never overwrites an existing file.',
    ...(users.length ? ['//', '// Used by legacy admin pages:', ...users.map((u) => '//   - ' + u)] : []),
  ];
  const fields = keys.map((k) => '    ' + safeKey(k) + ': ' + (k === 'id' ? '{ type: Number, index: true }' : typeOf(k)) + ',');
  const body = [
    'const schema = new mongoose.Schema(',
    '  {',
    '    _mysqlId: { type: Number, index: true },',
    ...fields,
    '  },',
    "  { strict: false, collection: '" + coll + "' }",
    ');',
    '',
    'export const ' + modelName + " = mongoose.models." + modelName + " || mongoose.model('" + modelName + "', schema);",
    '',
  ];
  const file = path.join(OUT_DIR, modelName + '.js');
  generated.push({ modelName, file: 'legacy/' + modelName + '.js', table, cols: keys.length });
  if (!dryRun) fs.writeFileSync(file, header.concat(['']).concat(body).join('\n'));
}

// One index for convenient bulk import.
if (!dryRun) {
  const index = [
    '// Re-exports every generated legacy model. Generated by',
    '// scripts/generateLegacyModels.mjs - regenerate rather than hand-edit.',
    ...generated.map((g) => "export { " + g.modelName + " } from './" + g.modelName + ".js';"),
    '',
  ];
  fs.writeFileSync(path.join(OUT_DIR, 'index.js'), index.join('\n'));
}

for (const g of generated) console.log('  ' + g.file.padEnd(46) + g.table.padEnd(30) + g.cols + ' fields');
console.log((dryRun ? 'would write ' : 'wrote ') + generated.length + ' models' + (dryRun ? '' : ' + legacy/index.js'));
await mongoose.disconnect();
