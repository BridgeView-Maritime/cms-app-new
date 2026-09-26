// BMPL back-office, part 2: the pages that are neither a plain list nor part
// of the sourcing pipeline.
//
//   control-panel   who can open which legacy page (users.bmpl)
//   pending-dg      crew_dg_data (DG / RPSL corrections awaiting DGS)
//   grievances      grievance + grievance_chat (sea service correction)
//   letters         ksa_visa undertakings (visa letter / nedpass letter)
//   invoice-builder crew invoices from sign-ons; vendor invoices
//   cvs             other-nationality and shore CVs (registration)
//   reports         month-end, candidate, crew welfare, expenses, sign-off
import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { canOpen, MENU } from '../bmpl/menu.js';
import { resolveRows, lookup, optionsOf } from '../bmpl/lookups.js';
import User from '../models/User.js';
import { CrewDgData } from '../models/CrewDgData.js';
import { Grievance } from '../models/Grievance.js';
import { LegacyGrievanceChat } from '../models/legacy/LegacyGrievanceChat.js';
import { LegacyKsaVisa } from '../models/legacy/LegacyKsaVisa.js';
import { LegacyInvoice } from '../models/legacy/LegacyInvoice.js';
import { LegacyInvoiceVendor } from '../models/legacy/LegacyInvoiceVendor.js';
import { LegacyBankaccounts } from '../models/legacy/LegacyBankaccounts.js';
import { LegacyPayments } from '../models/legacy/LegacyPayments.js';
import { LegacyMedicalRequest } from '../models/legacy/LegacyMedicalRequest.js';
import { LegacyFlagdocNew } from '../models/legacy/LegacyFlagdocNew.js';
import { LegacyBoCompany } from '../models/legacy/LegacyBoCompany.js';
import { LegacyAgentDetails } from '../models/legacy/LegacyAgentDetails.js';
import { LegacyVaccinationCard } from '../models/legacy/LegacyVaccinationCard.js';
import { LegacyRpslAgencies } from '../models/legacy/LegacyRpslAgencies.js';
import { LegacyVisiter } from '../models/legacy/LegacyVisiter.js';
import { LegacyTaskassign } from '../models/legacy/LegacyTaskassign.js';
import { ContractNew } from '../models/SeaService.js';
import { Vacancy } from '../models/Vacancy.js';
import { VacancyCandidate } from '../models/VacancyCandidate.js';
import { Registration } from '../models/Registration.js';
import { AddResume } from '../models/AddResume.js';
import { DocumentUpload } from '../models/CandidateExtras.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();
router.use(authenticateToken);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rx = (q) => new RegExp(escapeRegex(String(q).trim()), 'i');
const nowStamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const today = () => new Date().toISOString().slice(0, 10);
const paging = (req, def = 25) => ({ page: Math.max(1, parseInt(req.query.page, 10) || 1), limit: Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || def)) });
const idVariants = (v) => [String(v), Number(v)].filter((x) => x === x);
const gate = (...pages) => (req, res, next) => (pages.some((p) => canOpen(req.user, p)) ? next() : res.status(403).json({ success: false, message: 'You do not have access to this section.' }));
const nextId = async (model, field) => (Number((await model.findOne({}).sort({ [field]: -1 }).select(field).lean())?.[field]) || 0) + 1;
const upperIndos = (v) => String(v || '').trim().toUpperCase();
const pageOf = (rows, total, page, limit) => ({ records: rows, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
const num = (v) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.-]/g, '')); return Number.isFinite(n) ? n : 0; };
// Legacy invoice rows often leave `total` blank; the amount is the sum of the fee columns.
const invTotal = (i) => num(i.total) || ['agencyfee', 'crewl_fee', 'other', 'medical_amount', 'visa_amount', 'travel_amount', 'certificate_amount', 'hts', 'brm', 'huet', 'hamount'].reduce((s, k) => s + num(i[k]), 0);
const isRealDate = (v) => { if (!v) return false; const s = v instanceof Date ? v.toISOString() : String(v); return !/^(0000|1000|1970)-/.test(s); };
const dstr = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v || '').slice(0, 10));

// Legacy date columns hold either Date objects (migrated) or strings (new
// rows); a range filter has to accept both.
const dateRange = (field, from, to) => {
  const or = [];
  if (from || to) {
    const d = {}; const s = {};
    if (from) { d.$gte = new Date(from + 'T00:00:00Z'); s.$gte = String(from); }
    if (to) { d.$lte = new Date(to + 'T23:59:59Z'); s.$lte = String(to) + ' 23:59:59'; }
    or.push({ [field]: d }, { [field]: s });
  }
  return or.length ? { $or: or } : {};
};
const rangeOf = (req) => {
  const from = String(req.query.from || '').slice(0, 10) || today().slice(0, 8) + '01';
  const to = String(req.query.to || '').slice(0, 10) || today();
  return { from, to };
};

// Distinct legacy columns are dirty (stray spaces, duplicates once trimmed),
// so every list offered as a filter goes through here.
const cleanList = (values) => [...new Set(values.map((v) => String(v ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

const peopleByIndos = async (indosList, fields = { name: 1, indosno: 1, email: 1, mobile: 1, rankname: 1, passport: 1 }) => {
  const list = [...new Set(indosList.map(upperIndos).filter(Boolean))];
  if (!list.length) return new Map();
  const people = await LegacyVisiter.find({ $expr: { $in: [{ $toUpper: { $ifNull: ['$indosno', ''] } }, list] } }, fields).lean();
  return new Map(people.map((p) => [upperIndos(p.indosno), p]));
};

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'bmpl-docs');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({ destination: (req, file, cb) => cb(null, UPLOAD_DIR), filename: (req, file, cb) => cb(null, Date.now() + '_dg_' + file.originalname.replace(/[^a-zA-Z0-9._-]+/g, '_')) }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => (/pdf|jpeg|jpg|png/i.test(file.mimetype) ? cb(null, true) : cb(new Error('PDF or image files only.'))),
});

// ===========================================================================
// CMS CONTROL PANEL - per-user legacy page permissions
// ===========================================================================
const ALL_PAGES = MENU.map((g) => ({ key: g.key, label: g.label, items: g.items.map((i) => ({ label: i.label, legacyPage: i.legacyPage })) }));

router.get('/control-panel/users', gate('manage_users.php'), async (req, res) => {
  try {
    const users = await User.find({ $or: [{ 'bmpl.legacy_id': { $ne: null } }, { 'bmpl.all_access': true }, { 'bmpl.pages.0': { $exists: true } }] }).populate('role_id', 'role_code role_name').select('username email status bmpl role_id createdAt').sort({ status: 1, username: 1 }).lean();
    return res.json({
      success: true,
      menus: ALL_PAGES,
      users: users.map((u) => ({ _id: u._id, username: u.username, email: u.email, status: u.status, role: u.role_id?.role_code || '', bmpl: u.bmpl || { all_access: false, pages: [] }, pageCount: u.bmpl?.all_access ? 'all' : (u.bmpl?.pages || []).length })),
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.put('/control-panel/users/:id', gate('manage_users.php'), async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ success: false, message: 'User not found.' });
    const b = req.body || {};
    u.bmpl = u.bmpl || {};
    if (b.all_access !== undefined) u.bmpl.all_access = Boolean(b.all_access);
    if (Array.isArray(b.pages)) u.bmpl.pages = [...new Set(b.pages.map(String).filter(Boolean))];
    if (b.department !== undefined) u.bmpl.department = String(b.department || '').trim();
    if (b.status && ['Active', 'Inactive', 'Blocked'].includes(b.status)) u.status = b.status;
    u.markModified('bmpl');
    await u.save();
    return res.json({ success: true, message: 'Permissions saved.' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// Any admin user can be given BMPL access from here.
router.get('/control-panel/candidates', gate('manage_users.php'), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ success: true, users: [] });
    const r = rx(q);
    const users = await User.find({ $or: [{ username: r }, { email: r }] }).populate('role_id', 'role_code').select('username email status role_id bmpl').limit(20).lean();
    return res.json({ success: true, users: users.map((u) => ({ _id: u._id, username: u.username, email: u.email, status: u.status, role: u.role_id?.role_code || '', hasBmpl: Boolean(u.bmpl?.legacy_id || u.bmpl?.all_access || u.bmpl?.pages?.length) })) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// ===========================================================================
// PENDING ISSUES WITH DG (crew_dg_data)
// ===========================================================================
const DG_FIELDS = ['crew_name', 'cdc_indos_no', 'indos_no', 'correct_data', 'wrong_update_in_dgrpsl', 'correction_amount', 'bharat_kosh_transaction_id', 'dgs_status', 'record_date'];
const DG_STATUSES = ['Pending', 'Submitted', 'Corrected', 'Rejected'];

router.get('/pending-dg', gate('pendingissuewithdg.php'), async (req, res) => {
  try {
    const { page, limit } = paging(req);
    const and = [];
    if (req.query.status) and.push({ dgs_status: String(req.query.status) });
    const q = String(req.query.q || '').trim();
    if (q) { const r = rx(q); and.push({ $or: [{ crew_name: r }, { indos_no: r }, { cdc_indos_no: r }, { correct_data: r }, { wrong_update_in_dgrpsl: r }, { bharat_kosh_transaction_id: r }] }); }
    const filter = and.length ? { $and: and } : {};
    const [rows, total, totals] = await Promise.all([
      CrewDgData.find(filter).sort({ id: -1 }).skip((page - 1) * limit).limit(limit).lean(), CrewDgData.countDocuments(filter),
      CrewDgData.aggregate([{ $group: { _id: '$dgs_status', n: { $sum: 1 }, amount: { $sum: { $ifNull: ['$correction_amount', 0] } } } }]),
    ]);
    return res.json({ success: true, statuses: DG_STATUSES, totals, ...pageOf(rows.map((r) => ({ ...r, documentUrl: r.document_path ? '/uploads/bmpl-docs/' + encodeURIComponent(r.document_path) : null })), total, page, limit) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

const dgBody = (b, doc) => { for (const f of DG_FIELDS) if (b[f] !== undefined) doc[f] = f === 'correction_amount' ? num(b[f]) : String(b[f] ?? '').trim(); if (doc.dgs_status && !DG_STATUSES.includes(doc.dgs_status)) doc.dgs_status = 'Pending'; return doc; };

router.post('/pending-dg', gate('pendingissuewithdg.php'), async (req, res) => {
  try {
    const b = req.body || {};
    if (!String(b.crew_name || '').trim()) return res.status(400).json({ success: false, message: 'Crew name is required.' });
    const id = await nextId(CrewDgData, 'id');
    const doc = dgBody(b, { id, _mysqlId: id, dgs_status: 'Pending', record_date: today(), user: req.user.username, created_at: nowStamp(), updated_at: nowStamp() });
    doc.indos_no = upperIndos(doc.indos_no);
    const created = await CrewDgData.create(doc);
    return res.status(201).json({ success: true, message: 'Record added.', record: created.toObject() });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.put('/pending-dg/:id', gate('pendingissuewithdg.php'), async (req, res) => {
  try {
    const doc = await CrewDgData.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Record not found.' });
    dgBody(req.body || {}, doc);
    doc.indos_no = upperIndos(doc.indos_no);
    doc.updated_at = nowStamp();
    await doc.save();
    return res.json({ success: true, message: 'Saved.' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/pending-dg/:id', gate('pendingissuewithdg.php'), async (req, res) => {
  try {
    const doc = await CrewDgData.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Record not found.' });
    if (doc.document_path) { const p = path.join(UPLOAD_DIR, path.basename(doc.document_path)); if (fs.existsSync(p)) fs.unlinkSync(p); }
    return res.json({ success: true, message: 'Deleted.' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.post('/pending-dg/:id/document', gate('pendingissuewithdg.php'), (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    try {
      const doc = await CrewDgData.findById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: 'Record not found.' });
      doc.document_path = req.file.filename; doc.updated_at = nowStamp();
      await doc.save();
      return res.json({ success: true, message: 'Document uploaded.' });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  });
});

// ===========================================================================
// SEA SERVICE CORRECTION (grievance + grievance_chat)
// ===========================================================================
router.get('/grievances', gate('sea_service_correction.php'), async (req, res) => {
  try {
    const { page, limit } = paging(req);
    const and = [];
    if (req.query.open === '1') and.push({ status: { $in: ['1', 1] } });
    if (req.query.open === '0') and.push({ status: { $nin: ['1', 1] } });
    const q = String(req.query.q || '').trim();
    if (q) { const r = rx(q); and.push({ $or: [{ g_title: r }, { g_remark: r }, { indosno: r }, { emailid: r }] }); }
    const filter = and.length ? { $and: and } : {};
    const [rows, total] = await Promise.all([Grievance.find(filter).sort({ id: -1 }).skip((page - 1) * limit).limit(limit).lean(), Grievance.countDocuments(filter)]);
    const ids = rows.map((r) => r.id).flatMap(idVariants);
    const [chats, people] = await Promise.all([
      LegacyGrievanceChat.aggregate([{ $match: { g_id: { $in: ids } } }, { $group: { _id: '$g_id', n: { $sum: 1 }, last: { $max: '$cdate' } } }]),
      peopleByIndos(rows.map((r) => r.indosno)),
    ]);
    const cBy = new Map(chats.map((c) => [String(c._id), c]));
    return res.json({ success: true, ...pageOf(rows.map((r) => ({ ...r, open: String(r.status) === '1', person: people.get(upperIndos(r.indosno)) || null, replies: cBy.get(String(r.id))?.n || 0, lastReply: cBy.get(String(r.id))?.last || null })), total, page, limit) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.get('/grievances/:id', gate('sea_service_correction.php'), async (req, res) => {
  try {
    const g = await Grievance.findById(req.params.id).lean();
    if (!g) return res.status(404).json({ success: false, message: 'Grievance not found.' });
    const [chat, people, contracts] = await Promise.all([
      LegacyGrievanceChat.find({ g_id: { $in: idVariants(g.id) } }).sort({ id: 1 }).lean(),
      peopleByIndos([g.indosno]),
      g.indosno ? ContractNew.find({ vcan_id: rx('^' + escapeRegex(upperIndos(g.indosno)) + '$') }).sort({ contract_id: -1 }).limit(20).lean() : [],
    ]);
    const cr = await resolveRows(contracts, { company_name: 'company', rank_id: 'rank' });
    return res.json({ success: true, grievance: { ...g, open: String(g.status) === '1', person: people.get(upperIndos(g.indosno)) || null }, chat, contracts: cr.map((c) => ({ ...c, company: c._display.company_name, rank: c._display.rank_id })) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.post('/grievances/:id/reply', gate('sea_service_correction.php'), async (req, res) => {
  try {
    const g = await Grievance.findById(req.params.id).lean();
    if (!g) return res.status(404).json({ success: false, message: 'Grievance not found.' });
    const chat = String(req.body?.chat || '').trim();
    if (!chat) return res.status(400).json({ success: false, message: 'Reply text is required.' });
    const id = await nextId(LegacyGrievanceChat, 'id');
    await LegacyGrievanceChat.create({ id, _mysqlId: id, g_id: g.id, emailid: g.emailid || '', indosno: g.indosno || '', chat, cdate: nowStamp(), user: req.user.username, status: '1' });
    return res.status(201).json({ success: true, message: 'Reply added.' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.post('/grievances/:id/close', gate('sea_service_correction.php'), async (req, res) => {
  try {
    const g = await Grievance.findById(req.params.id);
    if (!g) return res.status(404).json({ success: false, message: 'Grievance not found.' });
    const reopen = Boolean(req.body?.reopen);
    g.status = reopen ? 1 : 0;
    if (!reopen) g.g_close_remark = String(req.body?.remark || '').trim() || g.g_close_remark;
    await g.save();
    return res.json({ success: true, message: reopen ? 'Reopened.' : 'Closed.' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// ===========================================================================
// LETTERS - visa undertaking (ksa_visa) and NED pass letters
// ===========================================================================
const LETTER_PAGES = ['visa_details_search.php', 'nedpass_details_search.php'];
const LETTER_FIELDS = ['visa_no', 'consulate', 'appointment', 'loireceiveddate', 'agentsentdate', 'paidstatus', 'paytobmpl', 'paidby', 'paidamount', 'statusin', 'visa_issuance', 'visa_expiry', 'cover_letter', 'proceed_country', 'proceed_city', 'commencing_from', 'commencing_to', 'visa_category', 'visa_type', 'txt_vagent', 'vendor_amount', 'rate', 'issue_status', 'cancel_remark'];
const letterFilter = (kind) => (kind === 'nedpass' ? { $or: [{ visa_type: /ned/i }, { visa_category: /ned/i }] } : {});

router.get('/letters', gate(...LETTER_PAGES), async (req, res) => {
  try {
    const { page, limit } = paging(req);
    const { from, to } = rangeOf(req);
    const and = [{ status: { $in: ['1', 1] } }, letterFilter(req.query.kind), dateRange('doe', from, to)];
    const view = String(req.query.view || '');
    if (view === 'loi-pending') and.push({ $or: [{ loireceiveddate: { $in: ['1000-01-01', '0000-00-00', '', null] } }, { loireceiveddate: { $type: 'date', $lt: new Date('1901-01-01') } }] });
    if (view === 'loi-received') and.push({ loireceiveddate: { $nin: ['1000-01-01', '0000-00-00', '', null] } });
    if (view === 'paid') and.push({ paidstatus: 'Paid' });
    if (view === 'unpaid') and.push({ paidstatus: { $ne: 'Paid' } });
    if (view === 'not-received') and.push({ statusin: /NOT/i });
    if (view === 'cancellation') and.push({ visa_category: /cancel/i });
    if (req.query.companyid) and.push({ companyid: { $in: idVariants(req.query.companyid) } });
    const q = String(req.query.q || '').trim();
    if (q) { const r = rx(q); and.push({ $or: [{ name: r }, { indosno: r }, { passportno: r }, { company_name: r }, { visa_no: r }, { vesselname: r }] }); }
    const filter = { $and: and.filter((x) => Object.keys(x).length) };
    const [rows, total] = await Promise.all([LegacyKsaVisa.find(filter).sort({ ksa_id: -1 }).skip((page - 1) * limit).limit(limit).lean(), LegacyKsaVisa.countDocuments(filter)]);
    const resolved = await resolveRows(rows, { companyid: 'company', txt_vagent: 'agent', txt_staff: 'staff' });
    return res.json({ success: true, from, to, ...pageOf(resolved.map((r) => ({ ...r, company: r._display.companyid || r.company_name, agent: r._display.txt_vagent, staff: r._display.txt_staff, loiReceived: isRealDate(r.loireceiveddate) })), total, page, limit) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.get('/letters/options', gate(...LETTER_PAGES), async (req, res) => {
  try {
    const [company, agent] = await Promise.all([optionsOf('company'), optionsOf('agent')]);
    const types = await LegacyKsaVisa.distinct('visa_type');
    return res.json({ success: true, company, agent, types: cleanList(types).filter((t) => !/^\d+$/.test(t)) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.get('/letters/:id', gate(...LETTER_PAGES), async (req, res) => {
  try {
    const v = await LegacyKsaVisa.findById(req.params.id).lean();
    if (!v) return res.status(404).json({ success: false, message: 'Record not found.' });
    const [resolved] = await resolveRows([v], { companyid: 'company', txt_vagent: 'agent', txt_staff: 'staff' });
    const [people, companyDoc, agentDoc] = await Promise.all([
      peopleByIndos([v.indosno], { name: 1, indosno: 1, email: 1, mobile: 1, rankname: 1, passport: 1, dob: 1, address: 1, nationality: 1 }),
      v.companyid ? LegacyBoCompany.findOne({ com_id: { $in: idVariants(v.companyid) } }).lean() : null,
      v.txt_vagent ? LegacyAgentDetails.findOne({ id: { $in: idVariants(v.txt_vagent) } }).lean() : null,
    ]);
    return res.json({ success: true, letter: { ...resolved, company: resolved._display.companyid || v.company_name, agent: resolved._display.txt_vagent, staff: resolved._display.txt_staff }, person: people.get(upperIndos(v.indosno)) || null, companyDoc, agentDoc });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.put('/letters/:id', gate(...LETTER_PAGES), async (req, res) => {
  try {
    const doc = await LegacyKsaVisa.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Record not found.' });
    for (const f of LETTER_FIELDS) if (req.body[f] !== undefined) doc[f] = String(req.body[f] ?? '').trim();
    if (req.body.statusin !== undefined) doc.statusd = nowStamp();
    if (req.body.emailsent !== undefined) doc.emailsent = req.body.emailsent ? 1 : 0;
    await doc.save();
    return res.json({ success: true, message: 'Saved.' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// ===========================================================================
// INVOICE BUILDER - crew invoices from sign-ons, and vendor invoices
// ===========================================================================
const INVOICE_PAGES = ['newinvoice.php', 'create_vendor_invoice.php'];

router.get('/invoice-builder/options', gate(...INVOICE_PAGES), async (req, res) => {
  try {
    const [company, agent, banks, cmap] = await Promise.all([optionsOf('company'), optionsOf('agent'), LegacyBankaccounts.find({ status: { $in: ['1', 1] } }).sort({ id: 1 }).lean(), lookup('company')]);
    const shortnames = {}; for (const [id, info] of cmap) shortnames[id] = info.short || '';
    const [lastInv, lastVendor] = await Promise.all([LegacyInvoice.findOne({}).sort({ invoiceno: -1 }).select('invoiceno invoic_no doe').lean(), LegacyInvoiceVendor.findOne({}).sort({ inv_count: -1 }).select('inv_count').lean()]);
    const categories = await LegacyInvoiceVendor.distinct('invoice');
    return res.json({ success: true, company, agent, shortnames, banks: banks.map((b) => ({ value: String(b.id), label: b.account_name + ' · ' + b.bank_name + ' · ' + b.account_number })), nextInvoiceNo: (Number(lastInv?.invoiceno) || 0) + 1, lastInvoice: lastInv?.invoic_no || '', nextVendorCount: (Number(lastVendor?.inv_count) || 0) + 1, categories: cleanList(categories) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// Sign-ons for one owner in a period, flagged when an invoice already exists.
router.get('/invoice-builder/contracts', gate('newinvoice.php'), async (req, res) => {
  try {
    const { from, to } = rangeOf(req);
    const company = String(req.query.company_name || '');
    if (!company) return res.status(400).json({ success: false, message: 'Choose an owner.' });
    const rows = await ContractNew.find({ $and: [{ company_name: { $in: idVariants(company) } }, dateRange('signondate', from, to)] }).sort({ signondate: -1 }).limit(500).lean();
    const indos = rows.map((r) => upperIndos(r.vcan_id)).filter(Boolean);
    const existing = indos.length ? await LegacyInvoice.find({ vcan_id: { $in: indos }, status: 'Active', companyid: { $in: idVariants(company) } }).select('vcan_id jdate invoic_no invoiceno').lean() : [];
    const invBy = new Map(); for (const i of existing) invBy.set(upperIndos(i.vcan_id) + '|' + dstr(i.jdate), i);
    const resolved = await resolveRows(rows, { rank_id: 'rank', company_name: 'company' });
    return res.json({ success: true, from, to, records: resolved.map((c) => { const inv = invBy.get(upperIndos(c.vcan_id) + '|' + dstr(c.signondate)); return { _id: c._id, contract_id: c.contract_id, vcan_id: c.vcan_id, fullname: c.fullname, rank: c._display.rank_id, vesselname: c.vesselname, signondate: dstr(c.signondate), signoffdate: isRealDate(c.signoffdate) ? dstr(c.signoffdate) : '', signtype: c.signtype, joiner_type: c.joiner_type, contractduration: c.contractduration, invoiced: inv ? inv.invoic_no || String(inv.invoiceno) : '' }; }) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// Create one invoice row per selected line (the legacy shape: one crew per row
// sharing an invoice number).
router.post('/invoice-builder', gate('newinvoice.php'), async (req, res) => {
  try {
    const b = req.body || {};
    const lines = Array.isArray(b.lines) ? b.lines : [];
    if (!b.company_name || !lines.length) return res.status(400).json({ success: false, message: 'Choose an owner and at least one crew line.' });
    const cmap = await lookup('company');
    const cinfo = cmap.get(String(b.company_name));
    const invoiceno = (Number((await LegacyInvoice.findOne({}).sort({ invoiceno: -1 }).select('invoiceno').lean())?.invoiceno) || 0) + 1;
    const invoic_no = String(b.invoic_no || '').trim() || ('BMPL/' + (cinfo?.short || 'INV') + '/' + invoiceno + '/' + today().slice(0, 4));
    let invid = (Number((await LegacyInvoice.findOne({}).sort({ invid: -1 }).select('invid').lean())?.invid) || 0);
    const docs = [];
    for (const l of lines) {
      invid += 1;
      const agencyfee = num(l.agencyfee), other = num(l.other), crewl_fee = num(l.crewl_fee), medical = num(l.medical_amount), visa = num(l.visa_amount), travel = num(l.travel_amount), cert = num(l.certificate_amount);
      docs.push({
        invid, _mysqlId: invid, invoiceno, invoic_no, po_number: String(b.po_number || ''), jobid: '', vcan_id: upperIndos(l.vcan_id), fullname: String(l.fullname || ''), invoicefor: 'ALL', passport: String(l.passport || ''),
        dayson_vessel: num(l.dayson_vessel), agencyfee, other, medical_amount: medical, visa_amount: visa, travel_amount: travel, certificate_amount: cert, crewl_fee, hts: 0, brm: 0, huet: 0, visa_cancelation: 0, hamount: 0, finder_fee: null, salary_ret: null, exrate: String(b.exrate || ''),
        total: String(agencyfee + other + crewl_fee + medical + visa + travel + cert), doe: nowStamp(), sort: '', bank_id: String(b.bank_id || ''), payment_date: String(b.payment_date || ''), status: 'Active', doneby: req.user.username, user: req.user.username,
        rankname: String(l.rank || ''), company_name: cinfo?.label || String(b.company_name), companyid: Number(b.company_name) || 0, vesselname: String(l.vesselname || ''), joiner_type: String(l.joiner_type || ''), increment: 0, creferenceno: String(b.creferenceno || ''),
        jdate: String(l.signondate || ''), jjdate: String(l.signoffdate || '1000-01-01'), fromdate: String(b.from || ''), todate: String(b.to || ''), istatus: 'NOT PRINTED', lockeds: 0, sentid: '0000-00-00', invunlockreq: 0, invunlockreqby: '', invunlockremark: '', cancelinvoice: 0, canceledby: '', cancelremarks: '', canceldate: '0000-00-00 00:00:00', invoice_raised: today(), invoice_sent: 'No', invoice_payed: 'No', update_at: '0000-00-00 00:00:00', update_by: '',
      });
    }
    await LegacyInvoice.insertMany(docs);
    return res.status(201).json({ success: true, message: 'Invoice ' + invoic_no + ' created with ' + docs.length + ' line(s).', invoiceno, invoic_no });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.get('/invoice-builder/invoices/:invoiceno', gate('newinvoice.php'), async (req, res) => {
  try {
    const rows = await LegacyInvoice.find({ invoiceno: { $in: idVariants(req.params.invoiceno) } }).sort({ invid: 1 }).lean();
    if (!rows.length) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    const bank = rows[0].bank_id ? await LegacyBankaccounts.findOne({ id: { $in: idVariants(rows[0].bank_id) } }).lean() : null;
    const company = rows[0].companyid ? await LegacyBoCompany.findOne({ com_id: { $in: idVariants(rows[0].companyid) } }).lean() : null;
    return res.json({ success: true, invoice: rows[0], lines: rows, bank, company, total: rows.reduce((s, r) => s + invTotal(r), 0) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.post('/invoice-builder/vendor', gate('create_vendor_invoice.php'), async (req, res) => {
  try {
    const b = req.body || {};
    if (!String(b.invoice || '').trim() || !b.vendor) return res.status(400).json({ success: false, message: 'Category and vendor are required.' });
    const id = await nextId(LegacyInvoiceVendor, 'id');
    const inv_count = (Number((await LegacyInvoiceVendor.findOne({}).sort({ inv_count: -1 }).select('inv_count').lean())?.inv_count) || 0) + 1;
    const created = await LegacyInvoiceVendor.create({ id, _mysqlId: id, invoice: String(b.invoice).trim(), inv_count, refno: String(b.refno || '').trim(), invoice_company: Number(b.invoice_company) || 0, items: String(b.items || '1'), vendor: Number(b.vendor) || String(b.vendor), increment: 0, fromdate: String(b.fromdate || ''), todate: String(b.todate || ''), doneby: req.user.username, cdate: nowStamp(), status: 1 });
    return res.status(201).json({ success: true, message: 'Vendor invoice #' + inv_count + ' created.', record: created.toObject() });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// What a vendor did for an owner in a period - the lines behind a vendor invoice.
router.get('/invoice-builder/vendor-lines', gate('create_vendor_invoice.php'), async (req, res) => {
  try {
    const { from, to } = rangeOf(req);
    const category = String(req.query.category || '');
    const company = req.query.company_name ? idVariants(req.query.company_name) : null;
    const vendor = req.query.vendor ? idVariants(req.query.vendor) : null;
    let rows = [];
    if (/medical/i.test(category)) rows = (await LegacyMedicalRequest.find({ $and: [dateRange('cdate', from, to), company ? { company: { $in: company } } : {}, vendor ? { vendor: { $in: vendor } } : {}].filter((x) => Object.keys(x).length) }).sort({ id: -1 }).limit(500).lean()).map((r) => ({ indosno: r.indosno, email: r.email, item: r.medical, vessel: r.vesselname, amount: num(r.amount || r.rate), date: r.cdate, company: r.company, vendor: r.vendor }));
    else if (/visa/i.test(category)) rows = (await LegacyKsaVisa.find({ $and: [dateRange('doe', from, to), company ? { companyid: { $in: company } } : {}, vendor ? { txt_vagent: { $in: vendor } } : {}].filter((x) => Object.keys(x).length) }).sort({ ksa_id: -1 }).limit(500).lean()).map((r) => ({ indosno: r.indosno, name: r.name, item: r.visa_type + ' ' + (r.visa_category || ''), vessel: r.vesselname, amount: num(r.vendor_amount || r.rate), date: r.doe, company: r.companyid, vendor: r.txt_vagent }));
    else if (/flag/i.test(category)) rows = (await LegacyFlagdocNew.find({ $and: [dateRange('cdate', from, to), company ? { company: { $in: company } } : {}, vendor ? { vendor: { $in: vendor } } : {}].filter((x) => Object.keys(x).length) }).sort({ id: -1 }).limit(500).lean()).map((r) => ({ indosno: r.indosno, email: r.email, item: r.certificate || r.flag, vessel: r.vesselname, amount: num(r.amount || r.rate), date: r.cdate, company: r.company, vendor: r.vendor }));
    else rows = (await LegacyPayments.find({ $and: [dateRange('payment_date', from, to), category ? { category: rx(category) } : {}].filter((x) => Object.keys(x).length) }).sort({ id: -1 }).limit(500).lean()).map((r) => ({ indosno: r.indosno, name: r.fullname, item: r.category + ' · ' + r.payment_to, amount: num(r.payment_amount), date: r.payment_date, status: r.payment_status }));
    const people = await peopleByIndos(rows.map((r) => r.indosno));
    return res.json({ success: true, from, to, records: rows.map((r) => ({ ...r, name: r.name || people.get(upperIndos(r.indosno))?.name || '' })), total: rows.reduce((s, r) => s + (r.amount || 0), 0) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// ===========================================================================
// CV LISTS - other nationality crew and shore candidates (registration)
// ===========================================================================
router.get('/cvs', gate('othernation_crew.php', 'allshorecv.php'), async (req, res) => {
  try {
    const { page, limit } = paging(req);
    const mode = req.query.mode === 'shore' ? 'shore' : 'other';
    if (!canOpen(req.user, mode === 'shore' ? 'allshorecv.php' : 'othernation_crew.php')) return res.status(403).json({ success: false, message: 'You do not have access to this section.' });
    const and = [mode === 'shore' ? { cvcategory: /^shore$/i } : { countryname: { $nin: ['', null, 'India', 'INDIA', 'india', 'Indian'] } }];
    const q = String(req.query.q || '').trim();
    if (q) { const r = rx(q); and.push({ $or: [{ uname: r }, { emailid: r }, { indosno: r }, { rank: r }, { phoneno: r }, { city: r }, { countryname: r }] }); }
    if (req.query.rank) and.push({ rank: rx('^' + escapeRegex(String(req.query.rank)) + '$') });
    if (req.query.country) and.push({ countryname: rx('^' + escapeRegex(String(req.query.country)) + '$') });
    // The legacy CV lists searched field by field, not with one box.
    for (const [param, field] of [['name', 'uname'], ['indosno', 'indosno'], ['email', 'emailid'], ['phone', 'phoneno'], ['city', 'city']]) {
      if (req.query[param]) and.push({ [field]: rx(req.query[param]) });
    }
    // Passport, CDC and ship type only exist on the CV, so match those first.
    const cvWhere = {};
    if (req.query.passport) cvWhere.$or = [{ passportno: rx(req.query.passport) }, { passport: rx(req.query.passport) }];
    if (req.query.cdc) cvWhere.seamanbno = rx(req.query.cdc);
    if (req.query.shiptype) cvWhere.shiptype = rx(req.query.shiptype);
    if (Object.keys(cvWhere).length) {
      const emails = (await AddResume.distinct('emailid', cvWhere)).map((e) => String(e || '').trim().toLowerCase()).filter(Boolean).slice(0, 20000);
      and.push(emails.length ? { $expr: { $in: [{ $toLower: { $ifNull: ['$emailid', ''] } }, emails] } } : { _id: null });
    }
    const filter = { $and: and };
    const [rows, total, ranks, countries] = await Promise.all([
      Registration.find(filter, { password: 0, repassword: 0, otp: 0, session: 0 }).sort({ regid: -1 }).skip((page - 1) * limit).limit(limit).lean(), Registration.countDocuments(filter),
      Registration.distinct('rank', and[0]), mode === 'other' ? Registration.distinct('countryname', and[0]) : [],
    ]);
    const emails = rows.map((r) => String(r.emailid || '').toLowerCase()).filter(Boolean);
    const resumes = emails.length ? await AddResume.find({ emailid: { $in: emails } }, { emailid: 1, fullname: 1, presentrank: 1, appliedrank: 1, shiptype: 1, passportno: 1, nationality: 1, salary: 1, availablefrom: 1, shore_department: 1, photo: 1, cdate: 1 }).lean() : [];
    const rBy = new Map(); for (const r of resumes) if (!rBy.has(String(r.emailid).toLowerCase())) rBy.set(String(r.emailid).toLowerCase(), r);
    const onboard = rows.length ? await ContractNew.find({ vcan_id: { $in: rows.map((r) => upperIndos(r.indosno)).filter(Boolean) }, signtype: 'Signon' }).select('vcan_id vesselname').lean() : [];
    const obBy = new Map(onboard.map((c) => [upperIndos(c.vcan_id), c.vesselname]));
    return res.json({ success: true, mode, ranks: cleanList(ranks), countries: cleanList(countries), ...pageOf(rows.map((r) => ({ ...r, resume: rBy.get(String(r.emailid || '').toLowerCase()) || null, onboard: obBy.get(upperIndos(r.indosno)) || '' })), total, page, limit) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// ===========================================================================
// REPORTS
// ===========================================================================
const REPORT_PAGES = ['monthreport.php', 'getinfo_candidate.php', 'crewwelfare_new_search.php', 'crew_welfare_report.php', 'all_report.php', 'expenses_report_search.php', 'signoff_searchemail.php'];
const groupCount = (rows, keyFn) => { const m = new Map(); for (const r of rows) { const k = keyFn(r) || '—'; m.set(k, (m.get(k) || 0) + 1); } return [...m.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n); };
const normJoiner = (j) => { const t = String(j || '').trim().toLowerCase(); if (t.startsWith('rejoin')) return 'Rejoiner'; if (t.startsWith('newjoin')) return 'Newjoiner'; if (t.startsWith('owner')) return 'Owner proposed'; return 'Not set'; };

router.get('/reports/month-end', gate('monthreport.php', 'all_report.php'), async (req, res) => {
  try {
    const { from, to } = rangeOf(req);
    const [signons, signoffs, proposals, vacRaised, vacClosed, tasks, candidates] = await Promise.all([
      ContractNew.find({ $and: [{ signon_status: { $in: ['1', 1] } }, dateRange('signondate', from, to)] }).select('vcan_id fullname company_name vesselname rank_id joiner_type signondate user doneby donevacancy').lean(),
      ContractNew.find({ $and: [{ signtype: 'Signoff' }, dateRange('signoffdate', from, to)] }).select('vcan_id fullname company_name vesselname rank_id reason signoffdate').lean(),
      VacancyCandidate.find({ date: { $gte: from, $lte: to + ' 23:59:59' } }).select('indosno status user sourceby company_name rank_id vacancyid date').lean(),
      Vacancy.countDocuments({ dov: { $gte: from, $lte: to + ' 23:59:59' } }),
      Vacancy.countDocuments({ exp: 'Close', doc: { $gte: from, $lte: to + ' 23:59:59' } }),
      LegacyTaskassign.find({ dov: { $gte: from, $lte: to + ' 23:59:59' } }).select('assignto ackn').lean(),
      LegacyVisiter.countDocuments({ doe: { $gte: from, $lte: to + ' 23:59:59' } }),
    ]);
    const [cmap, rmap, smap] = await Promise.all([lookup('company'), lookup('rank'), lookup('staff')]);
    const cName = (id) => cmap.get(String(id))?.label || String(id || '');
    const rName = (id) => rmap.get(String(id))?.label || String(id || '');
    const norm = (s) => { const t = String(s || '').toLowerCase(); return t === 'pending' ? 'Pending' : t === 'selected' ? 'Selected' : t.startsWith('selected on') ? 'Selected elsewhere' : t.startsWith('reject') ? 'Rejected' : t.replace(/\s/g, '') === 'backout' ? 'Backout' : t.startsWith('vacancy closed') ? 'Vacancy closed' : (s || 'Other'); };
    // Per executive: proposed / pending / selected (distinct candidates, as the legacy report did).
    const byUser = new Map();
    for (const p of proposals) { const u = p.user || '—'; const e = byUser.get(u) || { user: u, proposed: new Set(), pending: new Set(), selected: new Set(), companies: new Set() }; const k = upperIndos(p.indosno); e.proposed.add(k); if (norm(p.status) === 'Pending') e.pending.add(k); if (norm(p.status) === 'Selected') { e.selected.add(k); e.companies.add(cName(p.company_name)); } byUser.set(u, e); }
    const bySourcer = groupCount(proposals.filter((p) => p.sourceby), (p) => p.sourceby);
    return res.json({
      success: true, from, to,
      totals: { signons: signons.length, signoffs: signoffs.length, proposals: proposals.length, selected: proposals.filter((p) => norm(p.status) === 'Selected').length, vacanciesRaised: vacRaised, vacanciesClosed: vacClosed, tasksAssigned: tasks.length, tasksAcknowledged: tasks.filter((t) => String(t.ackn) === '1').length, candidatesAdded: candidates },
      signonsByCompany: groupCount(signons, (r) => cName(r.company_name)), signonsByRank: groupCount(signons, (r) => rName(r.rank_id)), signonsByJoiner: groupCount(signons, (r) => normJoiner(r.joiner_type)), signonsByUser: groupCount(signons, (r) => smap.get(String(r.doneby))?.label || r.user || r.doneby),
      signoffsByCompany: groupCount(signoffs, (r) => cName(r.company_name)), signoffsByReason: groupCount(signoffs, (r) => r.reason),
      proposalsByStatus: groupCount(proposals, (p) => norm(p.status)), proposalsByCompany: groupCount(proposals, (p) => cName(p.company_name)),
      executives: [...byUser.values()].map((e) => ({ user: e.user, proposed: e.proposed.size, pending: e.pending.size, selected: e.selected.size, companies: [...e.companies].filter(Boolean).slice(0, 8) })).sort((a, b) => b.proposed - a.proposed),
      sourcers: bySourcer,
      signons: signons.slice(0, 500).map((r) => ({ vcan_id: r.vcan_id, fullname: r.fullname, company: cName(r.company_name), vessel: r.vesselname, rank: rName(r.rank_id), joiner: normJoiner(r.joiner_type), date: dstr(r.signondate), vacancy: r.donevacancy })),
      signoffs: signoffs.slice(0, 500).map((r) => ({ vcan_id: r.vcan_id, fullname: r.fullname, company: cName(r.company_name), vessel: r.vesselname, rank: rName(r.rank_id), reason: r.reason, date: dstr(r.signoffdate) })),
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.get('/reports/candidate', gate('getinfo_candidate.php'), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ success: true, matches: [] });
    const r = rx(q);
    const matches = await LegacyVisiter.find({ $or: [{ indosno: r }, { name: r }, { email: r }, { passport: r }, { mobile: r }] }, { name: 1, indosno: 1, email: 1, mobile: 1, rankname: 1, passport: 1, dob: 1, nationality: 1, address: 1, doe: 1 }).sort({ id: -1 }).limit(15).lean();
    if (!matches.length) return res.json({ success: true, matches: [] });
    const indos = upperIndos(req.query.indos || matches[0].indosno);
    const person = matches.find((m) => upperIndos(m.indosno) === indos) || matches[0];
    const key = upperIndos(person.indosno);
    const [contracts, proposals, vaccines, docs, visas, payments] = await Promise.all([
      key ? ContractNew.find({ $expr: { $eq: [{ $toUpper: { $ifNull: ['$vcan_id', ''] } }, key] } }).sort({ contract_id: -1 }).lean() : [],
      key ? VacancyCandidate.find({ $expr: { $eq: [{ $toUpper: { $ifNull: ['$indosno', ''] } }, key] } }).sort({ id: -1 }).lean() : [],
      key ? LegacyVaccinationCard.find({ indosno: rx('^' + escapeRegex(key) + '$') }).sort({ id: -1 }).lean() : [],
      key ? DocumentUpload.find({ $expr: { $eq: [{ $toUpper: { $ifNull: ['$indosno', ''] } }, key] } }).sort({ id: -1 }).limit(3).lean() : [],
      key ? LegacyKsaVisa.find({ indosno: rx('^' + escapeRegex(key) + '$') }).sort({ ksa_id: -1 }).lean() : [],
      key ? LegacyPayments.find({ indosno: rx('^' + escapeRegex(key) + '$') }).sort({ id: -1 }).lean() : [],
    ]);
    const [cr, pr] = await Promise.all([resolveRows(contracts, { company_name: 'company', rank_id: 'rank' }), resolveRows(proposals, { company_name: 'company', rank_id: 'rank' })]);
    const seaDays = cr.reduce((s, c) => { if (!isRealDate(c.signondate)) return s; const end = isRealDate(c.signoffdate) ? new Date(dstr(c.signoffdate)) : new Date(); const d = (end - new Date(dstr(c.signondate))) / 86400000; return s + (d > 0 ? d : 0); }, 0);
    return res.json({
      success: true, matches, person,
      contracts: cr.map((c) => ({ ...c, company: c._display.company_name, rank: c._display.rank_id, signondate: dstr(c.signondate), signoffdate: isRealDate(c.signoffdate) ? dstr(c.signoffdate) : '' })),
      proposals: pr.map((p) => ({ ...p, company: p._display.company_name, rank: p._display.rank_id })),
      vaccines, documents: docs, visas, payments, seaDays: Math.round(seaDays),
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// Crew welfare: everyone currently on board (sign-on without sign-off), by owner.
router.get('/reports/crew-welfare', gate('crewwelfare_new_search.php', 'crew_welfare_report.php'), async (req, res) => {
  try {
    const and = [{ signtype: 'Signon' }];
    if (req.query.company_name) and.push({ company_name: { $in: idVariants(req.query.company_name) } });
    const rows = await ContractNew.find({ $and: and }).sort({ signondate: -1 }).limit(3000).lean();
    const resolved = await resolveRows(rows, { company_name: 'company', rank_id: 'rank' });
    const people = await peopleByIndos(rows.map((r) => r.vcan_id), { indosno: 1, mobile: 1, email: 1, passport: 1, dob: 1, nationality: 1, address: 1 });
    const agencies = await LegacyRpslAgencies.find({}).sort({ id: 1 }).lean();
    const now = new Date();
    const records = resolved.map((c) => { const p = people.get(upperIndos(c.vcan_id)); const on = isRealDate(c.signondate) ? new Date(dstr(c.signondate)) : null; return { _id: c._id, vcan_id: c.vcan_id, fullname: c.fullname, company: c._display.company_name, vessel: c.vesselname, rank: c._display.rank_id, signondate: on ? dstr(c.signondate) : '', expsignoffdate: isRealDate(c.expsignoffdate) ? dstr(c.expsignoffdate) : '', contractduration: c.contractduration, daysOnboard: on ? Math.max(0, Math.round((now - on) / 86400000)) : null, joiner: normJoiner(c.joiner_type), mobile: p?.mobile || '', email: p?.email || c.email || '', passport: p?.passport || '', nok: c.nok, nokdetails: c.nokdetails, relation: c.relation, port: c.txt_port, country: c.txt_country }; });
    const overdue = records.filter((r) => r.expsignoffdate && r.expsignoffdate < today()).length;
    return res.json({ success: true, records, byCompany: groupCount(records, (r) => r.company), byVessel: groupCount(records, (r) => r.company + ' · ' + r.vessel), byRank: groupCount(records, (r) => r.rank), overdue, agencies });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.get('/reports/expenses', gate('expenses_report_search.php', 'all_report.php'), async (req, res) => {
  try {
    const { from, to } = rangeOf(req);
    const company = req.query.company_name ? idVariants(req.query.company_name) : null;
    const [payments, invoices, visas, medicals, vendorInv] = await Promise.all([
      LegacyPayments.find({ $and: [dateRange('payment_date', from, to)] }).sort({ id: -1 }).lean(),
      LegacyInvoice.find({ $and: [{ status: 'Active' }, dateRange('doe', from, to), company ? { companyid: { $in: company } } : {}].filter((x) => Object.keys(x).length) }).select('invoiceno invoic_no vcan_id fullname company_name companyid vesselname rankname agencyfee crewl_fee other medical_amount visa_amount travel_amount certificate_amount hts brm huet hamount total doe payment_date invoice_payed cancelinvoice').lean(),
      LegacyKsaVisa.find({ $and: [dateRange('doe', from, to), company ? { companyid: { $in: company } } : {}].filter((x) => Object.keys(x).length) }).select('ksa_id name indosno company_name companyid visa_type visa_category vendor_amount rate paidstatus paytobmpl paidamount doe').lean(),
      LegacyMedicalRequest.find({ $and: [dateRange('cdate', from, to), company ? { company: { $in: company } } : {}].filter((x) => Object.keys(x).length) }).select('id indosno company vendor medical amount rate paymentby paidto_vendor paidto_bmpl cdate').lean(),
      LegacyInvoiceVendor.find({ $and: [{ status: { $in: ['1', 1] } }, dateRange('cdate', from, to), company ? { invoice_company: { $in: company } } : {}].filter((x) => Object.keys(x).length) }).lean(),
    ]);
    const cmap = await lookup('company'); const amap = await lookup('agent');
    const cName = (id) => cmap.get(String(id))?.label || String(id || '');
    const sum = (rows, f) => rows.reduce((s, r) => s + num(f(r)), 0);
    return res.json({
      success: true, from, to,
      totals: { payments: sum(payments, (r) => r.payment_amount), invoiced: sum(invoices.filter((i) => !Number(i.cancelinvoice)), invTotal), invoicesCount: invoices.length, visaVendor: sum(visas, (r) => r.vendor_amount || r.rate), medical: sum(medicals, (r) => r.amount || r.rate), vendorInvoices: vendorInv.length },
      paymentsByCategory: Object.entries(payments.reduce((m, p) => { const k = p.category || '—'; m[k] = (m[k] || 0) + num(p.payment_amount); return m; }, {})).map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount),
      invoicedByCompany: Object.entries(invoices.reduce((m, i) => { const k = cName(i.companyid) || i.company_name || '—'; m[k] = (m[k] || 0) + invTotal(i); return m; }, {})).map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount),
      payments: payments.slice(0, 500), invoices: invoices.slice(0, 500).map((i) => ({ ...i, amount: invTotal(i), company: cName(i.companyid) || i.company_name })),
      visas: visas.slice(0, 500).map((v) => ({ ...v, company: cName(v.companyid) || v.company_name })), medicals: medicals.slice(0, 500).map((m) => ({ ...m, company: cName(m.company) })),
      vendorInvoices: vendorInv.map((v) => ({ ...v, vendorName: amap.get(String(v.vendor))?.label || String(v.vendor), company: cName(v.invoice_company) })),
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.get('/reports/signoff', gate('signoff_searchemail.php'), async (req, res) => {
  try {
    const { from, to } = rangeOf(req);
    const and = [{ signtype: 'Signoff' }, dateRange('signoffdate', from, to)];
    if (req.query.company_name) and.push({ company_name: { $in: idVariants(req.query.company_name) } });
    if (req.query.reason) and.push({ reason: rx('^' + escapeRegex(String(req.query.reason)) + '$') });
    const rows = await ContractNew.find({ $and: and }).sort({ signoffdate: -1 }).limit(2000).lean();
    const resolved = await resolveRows(rows, { company_name: 'company', rank_id: 'rank' });
    const people = await peopleByIndos(rows.map((r) => r.vcan_id), { indosno: 1, mobile: 1, email: 1 });
    const records = resolved.map((c) => ({ _id: c._id, vcan_id: c.vcan_id, fullname: c.fullname, company: c._display.company_name, vessel: c.vesselname, rank: c._display.rank_id, signondate: dstr(c.signondate), signoffdate: dstr(c.signoffdate), reason: c.reason, remark: c.rreason, davailable: isRealDate(c.davailable) ? dstr(c.davailable) : '', email: people.get(upperIndos(c.vcan_id))?.email || (typeof c.email === 'string' ? c.email : ''), mobile: people.get(upperIndos(c.vcan_id))?.mobile || '', emailSent: String(c.email) === '1', by: c.ddos }));
    const reasons = await ContractNew.distinct('reason', { signtype: 'Signoff' });
    return res.json({ success: true, from, to, records, byReason: groupCount(records, (r) => r.reason), byCompany: groupCount(records, (r) => r.company), reasons: cleanList(reasons) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.get('/reports/options', gate(...REPORT_PAGES), async (req, res) => {
  try { return res.json({ success: true, company: await optionsOf('company') }); } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

export default router;
