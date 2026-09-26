// BMPL back-office: navigation, and the generic list / detail / create /
// update / archive API that every declarative resource in bmpl/resources.js
// is served through. Workflow endpoints live in bmplWorkflowRoutes.js.
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { RESOURCES, describe } from '../bmpl/resources.js';
import { LegacyVisiter } from '../models/legacy/LegacyVisiter.js';
import { MENU, menuFor, canOpen } from '../bmpl/menu.js';
import { resolveRows, optionsOf, invalidate } from '../bmpl/lookups.js';

const router = express.Router();
router.use(authenticateToken);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nowStamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const isPlainId = (v) => v !== undefined && v !== null && String(v).trim() !== '';

// ---------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------
function resourceFor(req, res) {
  const def = RESOURCES[req.params.resource];
  if (!def) { res.status(404).json({ success: false, message: 'Unknown resource.' }); return null; }
  if (!canOpen(req.user, def.legacyPage)) { res.status(403).json({ success: false, message: 'You do not have access to this section.' }); return null; }
  return def;
}

// What the client needs to draw the module: the menu this user sees, the
// definitions of the resources they can open, and who they are.
router.get('/init', async (req, res) => {
  try {
    const menu = menuFor(req.user);
    const resources = {};
    for (const key of Object.keys(RESOURCES)) if (canOpen(req.user, RESOURCES[key].legacyPage)) resources[key] = describe(key);
    return res.json({
      success: true,
      menu,
      resources,
      user: { username: req.user.username, role: req.user.role_code, bmpl: req.user.bmpl || null },
      allMenus: MENU.map((g) => ({ key: g.key, label: g.label, items: g.items.map((i) => i.legacyPage) })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------------------------------
// Generic resource API
// ---------------------------------------------------------------------------

// Decoded view of a row: `encoded` fields (legacy stores url-encoded HTML for
// email templates) come back readable; hidden fields never leave the server.
function present(def, row) {
  const out = { ...row };
  for (const f of def.hiddenFields || []) delete out[f];
  for (const f of def.form || []) if (f.encoded && typeof out[f.key] === 'string') { try { out[f.key] = decodeURIComponent(out[f.key].replace(/\+/g, ' ')); } catch { /* leave as-is */ } }
  return out;
}

// Legacy date columns hold Date objects (migrated rows) or 'YYYY-MM-DD ...'
// strings (rows written since), so a range has to match both shapes.
function dateRangeClause(field, from, to) {
  const asDate = {}; const asText = {};
  if (from) { asDate.$gte = new Date(from + 'T00:00:00Z'); asText.$gte = String(from); }
  if (to) { asDate.$lte = new Date(to + 'T23:59:59Z'); asText.$lte = String(to) + '~'; }
  return { $or: [{ [field]: asDate }, { [field]: asText }] };
}

/**
 * The legacy lists reached sideways for two things this engine could not:
 * the candidate behind an INDOS number, and "how many children does this row
 * have". Both are one extra query per page of rows.
 */
async function decorate(def, rows) {
  if (!rows.length) return rows;
  if (def.personBy) {
    const keys = [...new Set(rows.map((r) => String(r[def.personBy] ?? '').trim().toUpperCase()).filter(Boolean))];
    if (keys.length) {
      const people = await LegacyVisiter.find(
        { $expr: { $in: [{ $toUpper: { $ifNull: ['$indosno', ''] } }, keys] } },
        { name: 1, indosno: 1, rankname: 1, passport: 1, email: 1, mobile: 1, cdc: 1 },
      ).lean();
      const byIndos = new Map(people.map((x) => [String(x.indosno || '').trim().toUpperCase(), x]));
      for (const r of rows) r._person = byIndos.get(String(r[def.personBy] ?? '').trim().toUpperCase()) || null;
    }
  }
  for (const c of def.counts || []) {
    const locals = [...new Set(rows.map((r) => r[c.local]).filter((v) => v !== undefined && v !== null && v !== ''))];
    const variants = locals.flatMap((v) => [String(v), Number(v)]).filter((x) => x === x);
    if (!variants.length) continue;
    const grouped = await c.model.aggregate([{ $match: { [c.foreign]: { $in: variants } } }, { $group: { _id: '$' + c.foreign, n: { $sum: 1 } } }]);
    const byKey = new Map(grouped.map((g) => [String(g._id), g.n]));
    for (const r of rows) { r._counts = r._counts || {}; r._counts[c.key] = byKey.get(String(r[c.local])) || 0; }
  }
  return rows;
}

function buildFilter(def, query) {
  const and = [];
  if (def.baseFilter) and.push(def.baseFilter);

  const q = String(query.q || '').trim();
  if (q && def.search?.length) {
    const rx = new RegExp(escapeRegex(q), 'i');
    and.push({ $or: def.search.map((f) => ({ [f]: rx })) });
  }
  for (const flt of def.filters || []) {
    if (flt.type === 'daterange') {
      const from = String(query[flt.key + '_from'] || '').slice(0, 10);
      const to = String(query[flt.key + '_to'] || '').slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(from) || /^\d{4}-\d{2}-\d{2}$/.test(to)) and.push(dateRangeClause(flt.key, from, to));
      continue;
    }
    const v = query[flt.key];
    if (isPlainId(v)) and.push({ [flt.key]: { $in: [String(v), Number(v)].filter((x) => x === x) } });
  }
  // Related-record lists pass an arbitrary field=value (e.g. company_name=55).
  if (query.by && isPlainId(query.byValue)) {
    const field = String(query.by);
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) and.push({ [field]: { $in: [String(query.byValue), Number(query.byValue)].filter((x) => x === x) } });
  }
  return and.length === 0 ? {} : and.length === 1 ? and[0] : { $and: and };
}

// LIST
router.get('/r/:resource', async (req, res) => {
  const def = resourceFor(req, res); if (!def) return;
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const filter = buildFilter(def, req.query);

    let sort = def.defaultSort || { _id: -1 };
    if (req.query.sort && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(req.query.sort)) sort = { [req.query.sort]: req.query.dir === 'asc' ? 1 : -1 };

    const projection = {};
    for (const f of def.hiddenFields || []) projection[f] = 0;

    const [rows, total] = await Promise.all([
      def.model.find(filter, projection).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      def.model.countDocuments(filter),
    ]);
    const decorated = await decorate(def, rows);
    const records = (def.lookups ? await resolveRows(decorated, def.lookups) : decorated).map((r) => present(def, r));
    return res.json({ success: true, records, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// EXPORT - the whole filtered set as CSV, the way every legacy list had a
// "Download Excel" button. Capped so one click cannot pull a 40k-row table.
const EXPORT_CAP = 10000;
const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

router.get('/r/:resource/export', async (req, res) => {
  const def = resourceFor(req, res); if (!def) return;
  try {
    const filter = buildFilter(def, req.query);
    let sort = def.defaultSort || { _id: -1 };
    if (req.query.sort && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(req.query.sort)) sort = { [req.query.sort]: req.query.dir === 'asc' ? 1 : -1 };
    const projection = {};
    for (const f of def.hiddenFields || []) projection[f] = 0;
    const rows = await decorate(def, await def.model.find(filter, projection).sort(sort).limit(EXPORT_CAP).lean());
    const resolved = (def.lookups ? await resolveRows(rows, def.lookups) : rows).map((r) => present(def, r));
    const cols = def.columns || [];
    const cell = (r, c) => {
      if (c.type === 'lookup') return r._display?.[c.key] ?? r[c.key];
      if (c.type === 'person') return [r._person?.name, r._person?.rankname, r._person?.passport].filter(Boolean).join(' / ');
      if (c.type === 'count') return r._counts?.[c.key] ?? 0;
      return r[c.key];
    };
    const body = resolved.map((r) => cols.map((c) => csvCell(cell(r, c))).join(',')).join('\r\n');
    const name = String(def.title || req.params.resource).replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="' + name + '-' + new Date().toISOString().slice(0, 10) + '.csv"');
    // BOM so Excel opens UTF-8 correctly, as the legacy exports did.
    return res.send('\ufeff' + cols.map((c) => csvCell(c.label)).join(',') + '\r\n' + body);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Filter dropdown values.
router.get('/r/:resource/filter-options', async (req, res) => {
  const def = resourceFor(req, res); if (!def) return;
  try {
    const out = {};
    for (const flt of def.filters || []) {
      if (flt.options) { out[flt.key] = flt.options; continue; }
      if (flt.from === 'distinct') {
        const values = await def.model.distinct(flt.key, def.baseFilter || {});
        out[flt.key] = values.map((v) => String(v ?? '').trim()).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a.localeCompare(b)).slice(0, 300).map((v) => ({ value: v, label: v }));
      } else if (String(flt.from || '').startsWith('lookup:')) {
        out[flt.key] = await optionsOf(flt.from.slice(7));
      }
    }
    // Options for lookup-typed form fields, so the edit form can offer a select.
    const formOptions = {};
    for (const f of def.form || []) if (f.type === 'lookup' && f.lookup) formOptions[f.key] = await optionsOf(f.lookup);
    return res.json({ success: true, filters: out, formOptions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DETAIL
router.get('/r/:resource/:id', async (req, res) => {
  const def = resourceFor(req, res); if (!def) return;
  try {
    const row = await def.model.findOne({ _id: req.params.id }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'Record not found.' });
    const [decorated] = await decorate(def, [row]);
    const [resolved] = def.lookups ? await resolveRows([decorated], def.lookups) : [decorated];
    return res.json({ success: true, record: present(def, resolved) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

function pickForm(def, body) {
  const out = {};
  for (const f of def.form || []) {
    if (body[f.key] === undefined) continue;
    let v = body[f.key];
    if (v === null) v = '';
    if (f.type === 'number') { v = String(v).trim(); v = v === '' ? '' : Number(v); if (Number.isNaN(v)) v = ''; }
    else if (typeof v === 'string') v = v.trim();
    if (f.encoded && typeof v === 'string') v = encodeURIComponent(v).replace(/%20/g, '+');
    out[f.key] = v;
  }
  return out;
}

function missingRequired(def, body) {
  return (def.form || []).filter((f) => f.required && !String(body[f.key] ?? '').trim()).map((f) => f.label);
}

// CREATE - new rows get the next legacy numeric id, so the old tooling that
// keys on it keeps working.
router.post('/r/:resource', async (req, res) => {
  const def = resourceFor(req, res); if (!def) return;
  if (!def.creatable) return res.status(405).json({ success: false, message: 'This section does not allow new records.' });
  try {
    const missing = missingRequired(def, req.body || {});
    if (missing.length) return res.status(400).json({ success: false, message: 'Please fill in: ' + missing.join(', ') });

    const doc = pickForm(def, req.body || {});
    const last = await def.model.findOne({}).sort({ [def.idField]: -1 }).select(def.idField).lean();
    const nextId = (Number(last?.[def.idField]) || 0) + 1;
    doc[def.idField] = nextId;
    doc._mysqlId = nextId;
    if (def.statusField && doc[def.statusField] === undefined) doc[def.statusField] = '1';
    if (def.stamp?.user) doc[def.stamp.user] = req.user.username;
    if (def.stamp?.date) doc[def.stamp.date] = nowStamp();

    const created = await def.model.create(doc);
    if (def.invalidates) invalidate(def.invalidates);
    return res.status(201).json({ success: true, message: 'Saved.', record: present(def, created.toObject()) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE
router.put('/r/:resource/:id', async (req, res) => {
  const def = resourceFor(req, res); if (!def) return;
  if (!def.editable) return res.status(405).json({ success: false, message: 'This section is read-only.' });
  try {
    const doc = await def.model.findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ success: false, message: 'Record not found.' });
    const missing = missingRequired(def, { ...doc.toObject(), ...(req.body || {}) });
    if (missing.length) return res.status(400).json({ success: false, message: 'Please fill in: ' + missing.join(', ') });
    Object.assign(doc, pickForm(def, req.body || {}));
    await doc.save();
    if (def.invalidates) invalidate(def.invalidates);
    return res.json({ success: true, message: 'Updated.', record: present(def, doc.toObject()) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ROW ACTIONS - the legacy lists carried per-row buttons ("Click here to
// approve", "Cancel this nedpass", "Mark handed over"). Each one just stamped
// a few columns, so resources declare them and this applies them.
//   { key, label, set: { field: value | '$user' | '$now' | '$today' | '$id' }, when, confirm }
const ACTION_TOKENS = (req) => ({
  $user: req.user.username,
  $userId: String(req.user.bmpl?.legacy_id ?? ''),
  $now: nowStamp(),
  $today: new Date().toISOString().slice(0, 10),
});

/** Is this action offered for this row? `when` is { field, equals } or { field, not }. */
export function actionAllowed(action, row) {
  if (!action.when) return true;
  const v = String(row?.[action.when.field] ?? '').trim();
  if (action.when.equals !== undefined) return v === String(action.when.equals);
  if (action.when.not !== undefined) return v !== String(action.when.not);
  if (action.when.empty) return v === '';
  if (action.when.notEmpty) return v !== '';
  return true;
}

router.post('/r/:resource/:id/action/:action', async (req, res) => {
  const def = resourceFor(req, res); if (!def) return;
  const action = (def.actions || []).find((a) => a.key === req.params.action);
  if (!action) return res.status(404).json({ success: false, message: 'Unknown action.' });
  try {
    const doc = await def.model.findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ success: false, message: 'Record not found.' });
    if (!actionAllowed(action, doc.toObject())) return res.status(409).json({ success: false, message: 'That action no longer applies to this record.' });
    const tokens = ACTION_TOKENS(req);
    for (const [field, raw] of Object.entries(action.set || {})) {
      let v = raw;
      if (typeof v === 'string' && v.charAt(0) === '$') {
        if (v === '$input') v = String(req.body?.[field] ?? '').trim();
        else v = tokens[v] !== undefined ? tokens[v] : v;
      }
      doc[field] = v;
    }
    // Free-text fields the action asks for (a remark, a reason).
    for (const f of action.ask || []) if (req.body?.[f.key] !== undefined) doc[f.key] = String(req.body[f.key] ?? '').trim();
    await doc.save();
    if (def.invalidates) invalidate(def.invalidates);
    return res.json({ success: true, message: action.done || (action.label + ' - done.') });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ARCHIVE / RESTORE - legacy rows are never deleted, they are flagged.
router.post('/r/:resource/:id/status', async (req, res) => {
  const def = resourceFor(req, res); if (!def) return;
  if (!def.statusField) return res.status(405).json({ success: false, message: 'This section has no active flag.' });
  try {
    const value = req.body?.active ? '1' : '0';
    const doc = await def.model.findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ success: false, message: 'Record not found.' });
    doc[def.statusField] = value;
    await doc.save();
    if (def.invalidates) invalidate(def.invalidates);
    return res.json({ success: true, message: value === '1' ? 'Reactivated.' : 'Deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE - only for the few tables the legacy app really deleted from.
router.delete('/r/:resource/:id', async (req, res) => {
  const def = resourceFor(req, res); if (!def) return;
  if (!def.deletable) return res.status(405).json({ success: false, message: 'Records in this section are deactivated, not deleted.' });
  try {
    const removed = await def.model.findOneAndDelete({ _id: req.params.id });
    if (!removed) return res.status(404).json({ success: false, message: 'Record not found.' });
    return res.json({ success: true, message: 'Deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
