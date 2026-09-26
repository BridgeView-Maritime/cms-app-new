// BMPL back-office: the crewing pipeline. These pages are workflows over
// several tables rather than lists, so they get purpose-built endpoints.
//
//   candidates      visiter (crewing-side candidate master)
//   vacancies       vacancies + vacanciescandidate (proposals) + taskassign
//   tasks           taskassign (vacancy assigned to a sourcing officer)
//   proposals       vacanciescandidate status flow
//   documentation   selected candidates' joining checklist
//   documents       document_upload per INDOS
//   travel          travel_schedule
//   signon          contractnew (sign-on / sign-off)
import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { canOpen } from '../bmpl/menu.js';
import { resolveRows, nameOf, lookup, optionsOf } from '../bmpl/lookups.js';
import { LegacyVisiter } from '../models/legacy/LegacyVisiter.js';
import { Vacancy } from '../models/Vacancy.js';
import { VacancyCandidate } from '../models/VacancyCandidate.js';
import { LegacyTaskassign } from '../models/legacy/LegacyTaskassign.js';
import { LegacyTvacanciescandidate } from '../models/legacy/LegacyTvacanciescandidate.js';
import { LegacyEditvacancies } from '../models/legacy/LegacyEditvacancies.js';
import { ContractNew } from '../models/SeaService.js';
import { DocumentUpload, TravelSchedule } from '../models/CandidateExtras.js';
import { Registration } from '../models/Registration.js';
import { AddResume } from '../models/AddResume.js';
import { LegacyQuestionbank } from '../models/legacy/LegacyQuestionbank.js';
import { LegacyBlacklist } from '../models/legacy/LegacyBlacklist.js';
import { LegacyInvoice } from '../models/legacy/LegacyInvoice.js';
import { LegacyKsaVisa } from '../models/legacy/LegacyKsaVisa.js';
import { LegacyMedicalRequest } from '../models/legacy/LegacyMedicalRequest.js';
import { LegacyFlagdocNew } from '../models/legacy/LegacyFlagdocNew.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();
router.use(authenticateToken);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rx = (q) => new RegExp(escapeRegex(String(q).trim()), 'i');
const nowStamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const today = () => new Date().toISOString().slice(0, 10);
// 500 is the ceiling so the CSV exports (which page through these same
// endpoints) need ten requests rather than fifty.
const paging = (req, def = 25) => ({ page: Math.max(1, parseInt(req.query.page, 10) || 1), limit: Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || def)) });
const idVariants = (v) => [String(v), Number(v)].filter((x) => x === x);
const gate = (page) => (req, res, next) => (canOpen(req.user, page) ? next() : res.status(403).json({ success: false, message: 'You do not have access to this section.' }));
const nextId = async (model, field) => (Number((await model.findOne({}).sort({ [field]: -1 }).select(field).lean())?.[field]) || 0) + 1;
const upperIndos = (v) => String(v || '').trim().toUpperCase();
const byIndos = (field, indos) => ({ $expr: { $eq: [{ $toUpper: { $ifNull: ['$' + field, ''] } }, upperIndos(indos)] } });
// Legacy "not set" dates: 0000-00-00, 1000-01-01 and the odd 1970 epoch row.
const isRealDate = (v) => { if (!v) return false; const s = v instanceof Date ? v.toISOString() : String(v); return !/^(0000|1000|1970)-/.test(s); };

/** The candidate records behind a page of INDOS numbers, keyed by INDOS. */
async function peopleFor(list, fields = { name: 1, indosno: 1, email: 1, mobile: 1, rankname: 1, passport: 1, cdc: 1, coc: 1 }) {
  const keys = [...new Set(list.map(upperIndos).filter(Boolean))];
  if (!keys.length) return new Map();
  const rows = await LegacyVisiter.find({ $expr: { $in: [{ $toUpper: { $ifNull: ['$indosno', ''] } }, keys] } }, fields).lean();
  return new Map(rows.map((r) => [upperIndos(r.indosno), r]));
}

// Legacy proposal statuses, normalised for display.
const PROPOSAL_STATUS = [
  { key: 'Pending', label: 'Under Process' }, { key: 'Selected', label: 'Selected' },
  { key: 'Selected on Different Vacancy', label: 'Selected elsewhere' }, { key: 'Rejected', label: 'Rejected' },
  { key: 'Backout', label: 'Backed out' }, { key: 'Vacancy Closed', label: 'Vacancy closed' },
];
const normStatus = (s) => {
  const t = String(s || '').trim().toLowerCase();
  if (t === 'pending') return 'Pending';
  if (t === 'selected') return 'Selected';
  if (t.startsWith('selected on')) return 'Selected on Different Vacancy';
  if (t.startsWith('reject')) return 'Rejected';
  if (t.replace(/\s/g, '') === 'backout') return 'Backout';
  if (t.startsWith('vacancy closed')) return 'Vacancy Closed';
  return s || '';
};

// ===========================================================================
// DASHBOARD
// ===========================================================================
router.get('/stats', gate('dashboard.php'), async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const [openVacancies, candidates, pendingProposals, selected, unackedTasks, signonsMonth, signoffsMonth, travelSoon, unprintedInvoices, openTasksMine] = await Promise.all([
      Vacancy.countDocuments({ exp: 'Open', dstatus: { $in: ['1', 1] } }),
      LegacyVisiter.countDocuments({ status: { $in: ['1', 1] } }),
      VacancyCandidate.countDocuments({ status: /^pending$/i }),
      VacancyCandidate.countDocuments({ status: /^selected$/i }),
      LegacyTaskassign.countDocuments({ ackn: { $in: ['0', 0] } }),
      ContractNew.countDocuments({ signtype: 'Signon', doe: { $gte: since } }),
      ContractNew.countDocuments({ signtype: 'Signoff', dos: { $gte: since } }),
      TravelSchedule.countDocuments({ traveldate: { $gte: today(), $lte: in7 } }),
      LegacyInvoice.countDocuments({ status: 'Active' }),
      LegacyTaskassign.countDocuments({ ackn: { $in: ['0', 0] }, assignto: { $in: idVariants(req.user.bmpl?.legacy_id ?? -1) } }),
    ]);
    const recentVacancies = await Vacancy.find({ dstatus: { $in: ['1', 1] } }).sort({ id: -1 }).limit(8).lean();
    const recentProposals = await VacancyCandidate.find({}).sort({ id: -1 }).limit(8).lean();
    const [rv, rp] = await Promise.all([
      resolveRows(recentVacancies, { company_name: 'company', rankname: 'rank', vessel_id: 'vessel' }),
      resolveRows(recentProposals, { company_name: 'company', rank_id: 'rank' }),
    ]);
    const travel = await TravelSchedule.find({ traveldate: { $gte: today(), $lte: in7 } }).sort({ traveldate: 1 }).limit(8).lean();

    // "My Task" on the legacy dashboard: what is sitting with this user.
    const myId = req.user.bmpl?.legacy_id;
    const myTaskRows = myId ? await LegacyTaskassign.find({ assignto: { $in: idVariants(myId) } }).sort({ eid: -1 }).limit(10).lean() : [];
    const myVacancies = myTaskRows.length ? await Vacancy.find({ id: { $in: myTaskRows.map((t) => t.vacn_id).flatMap(idVariants) } }).lean() : [];
    const mvr = await resolveRows(myVacancies, { company_name: 'company', rankname: 'rank', vessel_id: 'vessel' });
    const mvById = new Map(mvr.map((v) => [String(v.id), v]));
    const myTasks = myTaskRows.map((t) => {
      const v = mvById.get(String(t.vacn_id));
      return { _id: t._id, vacancyId: t.vacn_id, vacancy_id: v?._id || null, acknowledged: String(t.ackn) === '1', on: t.dov, company: v?._display?.company_name || '', rank: v?._display?.rankname || '', vessel: v?._display?.vessel_id || '', exp: v?.exp || '' };
    });

    // Six months of movements, for the trend the legacy dashboard charted.
    const monthStarts = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - (5 - i)); return d; });
    const trend = [];
    for (const start of monthStarts) {
      const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
      const from = start.toISOString().slice(0, 10); const to = end.toISOString().slice(0, 10);
      const range = (field) => ({ $or: [{ [field]: { $gte: start, $lt: end } }, { [field]: { $gte: from, $lt: to } }] });
      const [on, off, props] = await Promise.all([
        ContractNew.countDocuments({ $and: [{ signon_status: { $in: ['1', 1] } }, range('signondate')] }),
        ContractNew.countDocuments({ $and: [{ signtype: 'Signoff' }, range('signoffdate')] }),
        VacancyCandidate.countDocuments({ date: { $gte: from, $lt: to } }),
      ]);
      trend.push({ month: start.toLocaleString('en', { month: 'short', year: '2-digit', timeZone: 'UTC' }), signons: on, signoffs: off, proposals: props });
    }

    return res.json({
      success: true,
      myTasks, trend,
      counts: { openVacancies, candidates, pendingProposals, selected, unackedTasks, signonsMonth, signoffsMonth, travelSoon, unprintedInvoices, openTasksMine },
      recentVacancies: rv.map((v) => ({ _id: v._id, id: v.id, company: v._display.company_name, rank: v._display.rankname, vessel: v._display.vessel_id, location: v.jlocation, exp: v.exp, dov: v.dov, user: v.user })),
      recentProposals: rp.map((p) => ({ _id: p._id, id: p.id, indosno: p.indosno, company: p._display.company_name, rank: p._display.rank_id, status: normStatus(p.status), date: p.date, user: p.user, vacancyid: p.vacancyid })),
      travel: travel.map((t) => ({ _id: t._id, indosno: t.indosno, from: t.travelplace, to: t.placeto, date: t.traveldate, details: t.travel_details })),
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// ===========================================================================
// CANDIDATES (visiter)
// ===========================================================================
router.get('/candidates', gate('ship_dashboard.php'), async (req, res) => {
  try {
    const { page, limit } = paging(req);
    const and = [];
    const q = String(req.query.q || '').trim();
    if (q) { const r = rx(q); and.push({ $or: [{ name: r }, { email: r }, { indosno: r }, { passport: r }, { mobile: r }] }); }
    for (const k of ['rankname', 'purpose', 'type', 'cvcategory', 'cdc', 'coc']) if (req.query[k]) and.push({ [k]: String(req.query[k]) });
    if (req.query.status) and.push({ status: { $in: idVariants(req.query.status) } });
    // The legacy CV search had a box per field, not one search bar.
    for (const [param, field] of [['name', 'name'], ['indosno', 'indosno'], ['passport', 'passport'], ['email', 'email'], ['mobile', 'mobile'], ['rank', 'rankname']]) {
      if (req.query[param]) and.push({ [field]: rx(req.query[param]) });
    }
    if (req.query.from) and.push({ doe: { $gte: String(req.query.from) } });
    if (req.query.to) and.push({ doe: { $lte: String(req.query.to) + ' 23:59:59' } });
    // Ship type / skills live on the public-site CV, so narrow by the emails
    // of the CVs that match, then filter the crewing records by those.
    const cvWhere = {};
    if (req.query.shiptype) cvWhere.shiptype = rx(req.query.shiptype);
    if (req.query.skills) cvWhere.$or = [{ skills: rx(req.query.skills) }, { technical_skills: rx(req.query.skills) }];
    if (Object.keys(cvWhere).length) {
      const emails = await AddResume.distinct('emailid', cvWhere);
      const clean = emails.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean).slice(0, 20000);
      and.push(clean.length ? { $expr: { $in: [{ $toLower: { $ifNull: ['$email', ''] } }, clean] } } : { _id: null });
    }
    const filter = and.length ? { $and: and } : {};
    const sort = req.query.sort === 'name' ? { name: 1 } : { vs_id: -1 };
    const [rows, total] = await Promise.all([LegacyVisiter.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(), LegacyVisiter.countDocuments(filter)]);
    // Ship type lives on the public-site CV, so join it for the rows on screen.
    const emails = rows.map((r) => String(r.email || '').trim().toLowerCase()).filter(Boolean);
    const cvs = emails.length ? await AddResume.find({ emailid: { $in: emails } }, { emailid: 1, shiptype: 1, seamanbno: 1, photo: 1, signature: 1, availablefrom: 1, presentrank: 1 }).lean() : [];
    const cvBy = new Map();
    for (const c of cvs) { const k = String(c.emailid || '').trim().toLowerCase(); if (!cvBy.has(k)) cvBy.set(k, c); }
    const records = rows.map((r) => {
      const cv = cvBy.get(String(r.email || '').trim().toLowerCase());
      return {
        ...r,
        shiptype: cv?.shiptype || '',
        cdcNumber: r.cdc || cv?.seamanbno || '',
        availablefrom: cv?.availablefrom || '',
        hasCv: Boolean(r.document || cv),
        hasPhoto: Boolean(r.image || cv?.photo),
        hasSign: Boolean(cv?.signature),
      };
    });
    return res.json({ success: true, records, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.get('/candidates/filters', gate('ship_dashboard.php'), async (req, res) => {
  try {
    const clean = (a) => a.map((v) => String(v ?? '').trim()).filter(Boolean).filter((v, i, x) => x.indexOf(v) === i).sort((a, b) => a.localeCompare(b));
    const [rankname, purpose, type, cvcategory] = await Promise.all(['rankname', 'purpose', 'type', 'cvcategory'].map((f) => LegacyVisiter.distinct(f)));
    return res.json({ success: true, rankname: clean(rankname).slice(0, 400), purpose: clean(purpose), type: clean(type), cvcategory: clean(cvcategory) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// The 360 view: crewing record + public-site profile + applications +
// contracts + documents + interview notes.
router.get('/candidates/:id', gate('ship_dashboard.php'), async (req, res) => {
  try {
    const v = await LegacyVisiter.findOne({ _id: req.params.id }).lean();
    if (!v) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    const indos = upperIndos(v.indosno);
    const email = String(v.email || '').trim().toLowerCase();
    const emailMatch = email ? { $expr: { $eq: [{ $toLower: { $ifNull: ['$emailid', ''] } }, email] } } : { _id: null };
    const [registration, addresume, proposals, contracts, documents, questions, blacklist, travel, visas, medicals, flags] = await Promise.all([
      Registration.findOne(emailMatch, { password: 0, repassword: 0, otp: 0 }).lean(),
      AddResume.findOne(emailMatch).lean(),
      indos ? VacancyCandidate.find(byIndos('indosno', indos)).sort({ id: -1 }).lean() : [],
      indos ? ContractNew.find(byIndos('vcan_id', indos)).sort({ contract_id: -1 }).lean() : [],
      indos ? DocumentUpload.find(byIndos('indosno', indos)).sort({ id: -1 }).lean() : [],
      indos ? LegacyQuestionbank.find(byIndos('indosno', indos)).sort({ id: -1 }).limit(20).lean() : [],
      indos ? LegacyBlacklist.find(byIndos('indosno', indos)).lean() : [],
      indos ? TravelSchedule.find(byIndos('indosno', indos)).sort({ id: -1 }).limit(10).lean() : [],
      indos ? LegacyKsaVisa.find(byIndos('indosno', indos)).sort({ ksa_id: -1 }).limit(10).lean() : [],
      indos ? LegacyMedicalRequest.find(byIndos('indosno', indos)).sort({ id: -1 }).limit(10).lean() : [],
      indos ? LegacyFlagdocNew.find(byIndos('indosno', indos)).sort({ id: -1 }).limit(10).lean() : [],
    ]);
    const vacIds = proposals.map((p) => p.vacancyid).filter(Boolean);
    const vacancies = vacIds.length ? await Vacancy.find({ id: { $in: vacIds.flatMap(idVariants) } }).lean() : [];
    const vById = new Map(vacancies.map((x) => [String(x.id), x]));
    const [props, cons, vacs] = await Promise.all([
      resolveRows(proposals, { company_name: 'company', rank_id: 'rank' }),
      resolveRows(contracts, { company_name: 'company', rank_id: 'rank' }),
      resolveRows(vacancies, { company_name: 'company', rankname: 'rank', vessel_id: 'vessel' }),
    ]);
    const vd = new Map(vacs.map((x) => [String(x.id), x]));
    return res.json({
      success: true,
      candidate: v,
      registration, addresume,
      proposals: props.map((p) => ({ ...p, status: normStatus(p.status), vacancy: vd.get(String(p.vacancyid)) ? { id: p.vacancyid, vessel: vd.get(String(p.vacancyid))._display.vessel_id, location: vd.get(String(p.vacancyid)).jlocation, exp: vd.get(String(p.vacancyid)).exp } : null })),
      contracts: cons,
      documents, questions, blacklist, travel, visas, medicals, flags,
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

const CANDIDATE_FIELDS = ['name', 'email', 'mobile', 'indosno', 'passport', 'rankname', 'purpose', 'cdc', 'coc', 'salary', 'type', 'cvcategory', 'aadharno', 'pancardno', 'sidno', 'dp_license', 'documentsr', 'dremark'];
router.put('/candidates/:id', gate('ship_dashboard.php'), async (req, res) => {
  try {
    const doc = await LegacyVisiter.findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    for (const f of CANDIDATE_FIELDS) if (req.body[f] !== undefined) doc[f] = String(req.body[f] ?? '').trim();
    await doc.save();
    return res.json({ success: true, message: 'Saved.', candidate: doc.toObject() });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.post('/candidates', gate('ship_dashboard.php'), async (req, res) => {
  try {
    const b = req.body || {};
    if (!String(b.name || '').trim() || !String(b.email || '').trim()) return res.status(400).json({ success: false, message: 'Name and email are required.' });
    const id = await nextId(LegacyVisiter, 'vs_id');
    const doc = { vs_id: id, _mysqlId: id, status: '1', doe: nowStamp(), addedby: req.user.username, type: 'From Ship', purpose: 'Job', residance_visa: '0', sea_panel: '1', contract_panel: '1', cms_email: '1' };
    for (const f of CANDIDATE_FIELDS) if (b[f] !== undefined) doc[f] = String(b[f] ?? '').trim();
    const created = await LegacyVisiter.create(doc);
    return res.status(201).json({ success: true, message: 'Candidate added.', candidate: created.toObject() });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// ===========================================================================
// VACANCIES
// ===========================================================================
const VACANCY_FIELDS = ['company_name', 'rankname', 'vessel_id', 'noopening', 'salary', 'currency_type', 'type_days', 'cduration', 'jlocation', 'nationality', 'visatype', 'excrew', 'rank_type', 'ship_type', 'shsub_id', 'agelimit', 'txt_jobarea', 'remark', 'crew_name', 'priority', 'tat', 'exp'];
const vacancyDisplay = (v) => ({ ...v, company: v._display?.company_name, rank: v._display?.rankname, vessel: v._display?.vessel_id, currency: v._display?.currency_type, shipCategory: v._display?.ship_type, shipSubcat: v._display?.shsub_id });

// The legacy vacancy list put the vessel's IMO and flag in the "Vessel
// Details" cell, so both travel with every vacancy row.
async function withVesselDetails(rows) {
  const vmap = await lookup('vessel');
  return rows.map((v) => {
    const info = vmap.get(String(v.vessel_id));
    return { ...v, vesselImo: info?.imo || '', vesselFlag: info?.flag || '' };
  });
}

router.get('/vacancies', gate('manage_vacancy.php'), async (req, res) => {
  try {
    const { page, limit } = paging(req);
    const and = [{ dstatus: { $in: ['1', 1] } }];
    if (req.query.exp) and.push({ exp: String(req.query.exp) });
    if (req.query.rejoining) and.push({ excrew: /rejoin/i });
    for (const k of ['company_name', 'rankname', 'vessel_id', 'user']) if (req.query[k]) and.push({ [k]: { $in: idVariants(req.query[k]) } });
    const q = String(req.query.q || '').trim();
    if (q) {
      const r = rx(q);
      const or = [{ jlocation: r }, { remark: r }, { crew_name: r }, { visatype: r }];
      if (/^\d+$/.test(q)) or.push({ id: Number(q) });
      // Search by owner / rank / vessel name too, via the lookup maps.
      const [cm, rm, vm] = await Promise.all([lookup('company'), lookup('rank'), lookup('vessel')]);
      const idsWhere = (map) => [...map.entries()].filter(([, info]) => r.test(info.label)).map(([id]) => id);
      const c = idsWhere(cm), rk = idsWhere(rm), vs = idsWhere(vm);
      if (c.length) or.push({ company_name: { $in: c.flatMap(idVariants) } });
      if (rk.length) or.push({ rankname: { $in: rk.flatMap(idVariants) } });
      if (vs.length) or.push({ vessel_id: { $in: vs.flatMap(idVariants) } });
      and.push({ $or: or });
    }
    const filter = { $and: and };
    const [rows, total] = await Promise.all([Vacancy.find(filter).sort({ id: -1 }).skip((page - 1) * limit).limit(limit).lean(), Vacancy.countDocuments(filter)]);
    const ids = rows.map((r) => r.id);
    const [resolved, counts] = await Promise.all([
      resolveRows(rows, { company_name: 'company', rankname: 'rank', vessel_id: 'vessel', currency_type: 'currency', ship_type: 'shipCategory', shsub_id: 'shipSubcat' }),
      VacancyCandidate.aggregate([{ $match: { vacancyid: { $in: ids.flatMap(idVariants) } } }, { $group: { _id: '$vacancyid', n: { $sum: 1 }, selected: { $sum: { $cond: [{ $regexMatch: { input: { $ifNull: ['$status', ''] }, regex: /^selected$/i } }, 1, 0] } } } }]),
    ]);
    const cById = new Map(counts.map((c) => [String(c._id), c]));
    const withVessel = await withVesselDetails(resolved);
    return res.json({ success: true, records: withVessel.map((v) => ({ ...vacancyDisplay(v), proposals: cById.get(String(v.id))?.n || 0, selected: cById.get(String(v.id))?.selected || 0 })), page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.get('/vacancies/options', gate('manage_vacancy.php'), async (req, res) => {
  try {
    const [company, rank, vessel, currency, shipCategory, shipSubcat, country, staff] = await Promise.all(['company', 'rank', 'vessel', 'currency', 'shipCategory', 'shipSubcat', 'country', 'staff'].map((n) => optionsOf(n)));
    const vmap = await lookup('vessel');
    const vesselsByCompany = {};
    for (const [id, info] of vmap) { const c = String(info.company || ''); (vesselsByCompany[c] = vesselsByCompany[c] || []).push({ value: id, label: info.label }); }
    const users = await Vacancy.distinct('user');
    const uniq = (a) => [...new Set(a.map((v) => String(v ?? '').trim()).filter(Boolean))].sort((x, y) => x.localeCompare(y));
    return res.json({ success: true, company, rank, vessel, vesselsByCompany, currency, shipCategory, shipSubcat, country, staff, users: uniq(users) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.get('/vacancies/:id', gate('manage_vacancy.php'), async (req, res) => {
  try {
    const v = await Vacancy.findOne({ _id: req.params.id }).lean();
    if (!v) return res.status(404).json({ success: false, message: 'Vacancy not found.' });
    const [resolved] = await resolveRows([v], { company_name: 'company', rankname: 'rank', vessel_id: 'vessel', currency_type: 'currency', ship_type: 'shipCategory', shsub_id: 'shipSubcat' });
    const [proposals, tasks, tprops, history] = await Promise.all([
      VacancyCandidate.find({ vacancyid: { $in: idVariants(v.id) } }).sort({ id: -1 }).lean(),
      LegacyTaskassign.find({ vacn_id: { $in: idVariants(v.id) } }).sort({ eid: -1 }).lean(),
      LegacyTvacanciescandidate.find({ vacancyid: { $in: idVariants(v.id) } }).sort({ id: -1 }).lean(),
      LegacyEditvacancies.find({ eid: { $in: idVariants(v.id) } }).sort({ eiddate: -1 }).lean(),
    ]);
    // Names for the proposed candidates.
    const indosList = proposals.map((p) => upperIndos(p.indosno)).filter(Boolean);
    const people = indosList.length ? await LegacyVisiter.find({ $expr: { $in: [{ $toUpper: { $ifNull: ['$indosno', ''] } }, indosList] } }, { name: 1, indosno: 1, email: 1, mobile: 1, rankname: 1, passport: 1 }).lean() : [];
    const pByIndos = new Map(people.map((p) => [upperIndos(p.indosno), p]));
    const [props, tks] = await Promise.all([resolveRows(proposals, { company_name: 'company', rank_id: 'rank', nationality: 'country' }), resolveRows(tasks, { assignto: 'staff', rankname: 'rank' })]);
    return res.json({
      success: true,
      vacancy: vacancyDisplay(resolved),
      proposals: props.map((p) => ({ ...p, status: normStatus(p.status), person: pByIndos.get(upperIndos(p.indosno)) || null, rank: p._display.rank_id, nationalityName: p._display.nationality })),
      tasks: tks.map((t) => ({ ...t, assignedTo: t._display.assignto, rank: t._display.rankname })),
      proposedToCompany: tprops,
      history: history.map((h) => ({ _id: h._id, on: h.eiddate, by: h.eidby, change: h.editremark, salary: h.salary, noopening: h.noopening, exp: h.exp, remark: h.remark })),
      statuses: PROPOSAL_STATUS,
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.post('/vacancies', gate('manage_vacancy.php'), async (req, res) => {
  try {
    const b = req.body || {};
    for (const f of ['company_name', 'rankname']) if (!String(b[f] || '').trim()) return res.status(400).json({ success: false, message: 'Owner and rank are required.' });
    const id = await nextId(Vacancy, 'id');
    const doc = { id, _mysqlId: id, dov: nowStamp(), exp: 'Open', dstatus: '1', ddate: '1000-10-10 00:00:00', website: '0', vacancyemail: '0', user: req.user.username, noopening: '1', excrew: 'Newjoiner', type_days: 'Permonth', currency_type: '2' };
    for (const f of VACANCY_FIELDS) if (b[f] !== undefined) doc[f] = String(b[f] ?? '').trim();
    const created = await Vacancy.create(doc);
    return res.status(201).json({ success: true, message: 'Vacancy created.', vacancy: created.toObject() });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.put('/vacancies/:id', gate('manage_vacancy.php'), async (req, res) => {
  try {
    const doc = await Vacancy.findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ success: false, message: 'Vacancy not found.' });
    for (const f of VACANCY_FIELDS) if (req.body[f] !== undefined) doc[f] = String(req.body[f] ?? '').trim();
    if (req.body.editremark) doc.editremark = String(req.body.editremark).trim();
    await doc.save();
    return res.json({ success: true, message: 'Saved.', vacancy: doc.toObject() });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.post('/vacancies/:id/close', gate('manage_vacancy.php'), async (req, res) => {
  try {
    const doc = await Vacancy.findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ success: false, message: 'Vacancy not found.' });
    const reopen = Boolean(req.body?.reopen);
    doc.exp = reopen ? 'Open' : 'Close';
    doc.editremark = reopen ? 'Vacancy opened again' : String(req.body?.reason || 'Closed').trim();
    doc.doc = nowStamp();
    await doc.save();
    return res.json({ success: true, message: reopen ? 'Vacancy reopened.' : 'Vacancy closed.' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// Propose a candidate (by INDOS) to a vacancy.
router.post('/vacancies/:id/propose', gate('manage_vacancy.php'), async (req, res) => {
  try {
    const v = await Vacancy.findOne({ _id: req.params.id }).lean();
    if (!v) return res.status(404).json({ success: false, message: 'Vacancy not found.' });
    const indos = upperIndos(req.body?.indosno);
    if (!indos) return res.status(400).json({ success: false, message: 'INDOS number is required.' });
    const person = await LegacyVisiter.findOne(byIndos('indosno', indos)).lean();
    if (!person) return res.status(404).json({ success: false, message: 'No candidate with INDOS ' + indos + '. Add them under View Candidate CV first.' });
    const dup = await VacancyCandidate.findOne({ $and: [{ vacancyid: { $in: idVariants(v.id) } }, byIndos('indosno', indos)] }).lean();
    if (dup) return res.status(409).json({ success: false, message: 'This candidate is already proposed for this vacancy.' });
    const id = await nextId(VacancyCandidate, 'id');
    const doc = await VacancyCandidate.create({
      id, _mysqlId: id, vacancyid: String(v.id), company_name: String(v.company_name || ''), rank_id: String(v.rankname || ''),
      indosno: indos, passport: person.passport || '', status: 'Pending', date: nowStamp(), pending_date: nowStamp(),
      user: req.user.username, sourceby: req.user.username, addedby: String(req.user.bmpl?.legacy_id || ''),
      remark: String(req.body?.remark || v.excrew || '').trim(), joiner_type: String(req.body?.joiner_type || v.excrew || 'Newjoiner').trim(),
      salary: String(req.body?.salary || v.salary || ''), currency_type: String(v.currency_type || ''), type_days: String(v.type_days || ''),
      email: '0', pending_approval: '1', selection_approval: '1', approve_position: '1',
    });
    return res.status(201).json({ success: true, message: 'Candidate proposed.', proposal: doc.toObject() });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// ===========================================================================
// SOURCING TASKS (taskassign)
// ===========================================================================
router.get('/tasks', gate('manage_task.php'), async (req, res) => {
  try {
    const { page, limit } = paging(req);
    const and = [];
    if (req.query.assignto) and.push({ assignto: { $in: idVariants(req.query.assignto) } });
    if (req.query.ack === '0') and.push({ ackn: { $in: ['0', 0] } });
    if (req.query.ack === '1') and.push({ ackn: { $in: ['1', 1] } });
    if (req.query.mine) and.push({ assignto: { $in: idVariants(req.user.bmpl?.legacy_id ?? -1) } });
    if (req.query.from) and.push({ dov: { $gte: String(req.query.from) } });
    if (req.query.to) and.push({ dov: { $lte: String(req.query.to) + ' 23:59:59' } });
    // Filtering by owner means filtering by the vacancies of that owner.
    if (req.query.company_name) {
      const ids = await Vacancy.distinct('id', { company_name: { $in: idVariants(req.query.company_name) } });
      and.push({ vacn_id: { $in: ids.flatMap(idVariants) } });
    }
    const q = String(req.query.q || '').trim();
    if (q && /^\d+$/.test(q)) and.push({ vacn_id: { $in: idVariants(q) } });
    const filter = and.length ? { $and: and } : {};
    const [rows, total] = await Promise.all([LegacyTaskassign.find(filter).sort({ eid: -1 }).skip((page - 1) * limit).limit(limit).lean(), LegacyTaskassign.countDocuments(filter)]);
    const vacIds = rows.map((r) => r.vacn_id).flatMap(idVariants);
    const [vacancies, proposalCounts] = await Promise.all([
      Vacancy.find({ id: { $in: vacIds } }).lean(),
      VacancyCandidate.aggregate([{ $match: { vacancyid: { $in: vacIds } } }, { $group: { _id: '$vacancyid', n: { $sum: 1 }, selected: { $sum: { $cond: [{ $regexMatch: { input: { $ifNull: ['$status', ''] }, regex: /^selected$/i } }, 1, 0] } } } }]),
    ]);
    const pById = new Map(proposalCounts.map((c) => [String(c._id), c]));
    const vr = await resolveRows(vacancies, { company_name: 'company', vessel_id: 'vessel', rankname: 'rank', currency_type: 'currency' });
    const vById = new Map(vr.map((v) => [String(v.id), v]));
    const tr = await resolveRows(rows, { assignto: 'staff', rankname: 'rank' });
    return res.json({
      success: true,
      records: tr.map((t) => {
        const v = vById.get(String(t.vacn_id));
        const c = pById.get(String(t.vacn_id));
        return {
          ...t, assignedTo: t._display.assignto, rank: t._display.rankname,
          proposals: c?.n || 0, selected: c?.selected || 0,
          vacancy: v ? { _id: v._id, id: v.id, company: v._display.company_name, vessel: v._display.vessel_id, rank: v._display.rankname, location: v.jlocation, exp: v.exp, salary: v.salary, currency: v._display.currency_type, type_days: v.type_days, noopening: v.noopening, remark: v.remark, dov: v.dov, excrew: v.excrew } : null,
        };
      }),
      page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// Hand a task to someone else ("Re Assign" on the legacy page).
router.put('/tasks/:id', gate('manage_task.php'), async (req, res) => {
  try {
    const doc = await LegacyTaskassign.findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ success: false, message: 'Task not found.' });
    const assignto = String(req.body?.assignto || '').trim();
    if (!assignto) return res.status(400).json({ success: false, message: 'Choose a staff member.' });
    doc.assignto = assignto;
    doc.assignby = req.user.username;
    doc.dov = nowStamp();
    doc.ackn = '0';
    doc.ackndate = '0000-00-00 00:00:00';
    await doc.save();
    return res.json({ success: true, message: 'Task reassigned.' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/tasks/:id', gate('manage_task.php'), async (req, res) => {
  try {
    const doc = await LegacyTaskassign.findOneAndDelete({ _id: req.params.id });
    if (!doc) return res.status(404).json({ success: false, message: 'Task not found.' });
    return res.json({ success: true, message: 'Task deleted.' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.post('/tasks', gate('manage_task.php'), async (req, res) => {
  try {
    const { vacancyId, assignto } = req.body || {};
    const v = await Vacancy.findOne({ id: { $in: idVariants(vacancyId) } }).lean();
    if (!v) return res.status(404).json({ success: false, message: 'Vacancy not found.' });
    if (!assignto) return res.status(400).json({ success: false, message: 'Choose a staff member.' });
    const eid = await nextId(LegacyTaskassign, 'eid');
    await LegacyTaskassign.create({ eid, _mysqlId: eid, vacn_id: String(v.id), dov: nowStamp(), rankname: String(v.rankname || ''), user: req.user.username, image: v.image || '', assignby: req.user.username, assignto: String(assignto), sassign: 'assigned', ackn: '0', ackndate: '0000-00-00 00:00:00' });
    return res.status(201).json({ success: true, message: 'Task assigned.' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.post('/tasks/:id/ack', gate('manage_task.php'), async (req, res) => {
  try {
    const doc = await LegacyTaskassign.findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ success: false, message: 'Task not found.' });
    doc.ackn = '1'; doc.ackndate = nowStamp();
    await doc.save();
    return res.json({ success: true, message: 'Acknowledged.' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// ===========================================================================
// PROPOSALS (vacanciescandidate status flow)
// ===========================================================================
async function proposalList(filter, req) {
  const { page, limit } = paging(req);
  const [rows, total] = await Promise.all([VacancyCandidate.find(filter).sort({ id: -1 }).skip((page - 1) * limit).limit(limit).lean(), VacancyCandidate.countDocuments(filter)]);
  const indosList = rows.map((p) => upperIndos(p.indosno)).filter(Boolean);
  const vacIds = rows.map((p) => p.vacancyid).flatMap(idVariants);
  const [people, vacancies] = await Promise.all([
    indosList.length ? LegacyVisiter.find({ $expr: { $in: [{ $toUpper: { $ifNull: ['$indosno', ''] } }, indosList] } }, { name: 1, indosno: 1, email: 1, mobile: 1, rankname: 1, passport: 1 }).lean() : [],
    vacIds.length ? Vacancy.find({ id: { $in: vacIds } }).lean() : [],
  ]);
  const pByIndos = new Map(people.map((p) => [upperIndos(p.indosno), p]));
  const vr = await resolveRows(vacancies, { vessel_id: 'vessel' });
  const vById = new Map(vr.map((v) => [String(v.id), v]));
  const resolved = await resolveRows(rows, { company_name: 'company', rank_id: 'rank', nationality: 'country' });
  return {
    records: resolved.map((p) => ({ ...p, status: normStatus(p.status), person: pByIndos.get(upperIndos(p.indosno)) || null, company: p._display.company_name, rank: p._display.rank_id, nationalityName: p._display.nationality, vacancy: vById.get(String(p.vacancyid)) ? { _id: vById.get(String(p.vacancyid))._id, id: p.vacancyid, vessel: vById.get(String(p.vacancyid))._display.vessel_id, location: vById.get(String(p.vacancyid)).jlocation, exp: vById.get(String(p.vacancyid)).exp } : null })),
    page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

router.get('/proposals', gate('proposed_candidates.php'), async (req, res) => {
  try {
    const and = [];
    if (req.query.status) and.push({ status: new RegExp('^' + escapeRegex(String(req.query.status)), 'i') });
    if (req.query.company_name) and.push({ company_name: { $in: idVariants(req.query.company_name) } });
    if (req.query.user) and.push({ user: String(req.query.user) });
    if (req.query.sourceby) and.push({ sourceby: String(req.query.sourceby) });
    if (req.query.vacancyid) and.push({ vacancyid: { $in: idVariants(req.query.vacancyid) } });
    if (req.query.joiner_type) and.push({ joiner_type: new RegExp('^' + escapeRegex(String(req.query.joiner_type)), 'i') });
    const q = String(req.query.q || '').trim();
    if (q) { const r = rx(q); const or = [{ indosno: r }, { passport: r }, { remark: r }, { feedback: r }]; if (/^\d+$/.test(q)) or.push({ vacancyid: q }); and.push({ $or: or }); }
    if (req.query.from) and.push({ date: { $gte: String(req.query.from) } });
    if (req.query.to) and.push({ date: { $lte: String(req.query.to) + ' 23:59:59' } });
    return res.json({ success: true, statuses: PROPOSAL_STATUS, ...(await proposalList(and.length ? { $and: and } : {}, req)) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

const PROPOSAL_FIELDS = ['status', 'remark', 'feedback', 'salary', 'currency_type', 'type_days', 'joiner_type', 'interview', 'interview_date', 'interview_doneby', 'eng_comm', 'technical_skills', 'answers', 'stage', 'medical', 'flag_pen', 'ppe', 'visa', 'hotel', 'form1', 'immigration', 'security_deposit', 'security_deposit_status', 'rpsl_agencies', 'tracking_id', 'documentation_status', 'assigned_to', 'approvaldate'];
router.put('/proposals/:id', gate('proposed_candidates.php'), async (req, res) => {
  try {
    const doc = await VacancyCandidate.findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ success: false, message: 'Proposal not found.' });
    const b = req.body || {};
    const before = normStatus(doc.status);
    for (const f of PROPOSAL_FIELDS) if (b[f] !== undefined) doc[f] = String(b[f] ?? '').trim();
    if (b.status !== undefined) {
      const s = normStatus(b.status);
      doc.status = s;
      if (s === 'Pending' && before !== 'Pending') doc.pending_date = nowStamp();
      if (s === 'Selected' && before !== 'Selected') { doc.date = nowStamp(); doc.approvedby = req.user.username; }
      if (s === 'Rejected' && before !== 'Rejected') doc.rej_date = nowStamp();
    }
    await doc.save();
    return res.json({ success: true, message: 'Saved.', proposal: { ...doc.toObject(), status: normStatus(doc.status) } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// ===========================================================================
// DOCUMENTATION - the joining checklist for selected candidates
// ===========================================================================
export const DOC_CHECKLIST = [
  { key: 'interview', label: 'Interview' }, { key: 'medical', label: 'Medical' }, { key: 'flag_pen', label: 'Flag / Pen' },
  { key: 'ppe', label: 'PPE' }, { key: 'visa', label: 'Visa' }, { key: 'hotel', label: 'Hotel' }, { key: 'form1', label: 'Form 1' }, { key: 'immigration', label: 'Immigration' },
];

router.get('/documentation', gate('manage_tapproval.php'), async (req, res) => {
  try {
    const and = [{ status: /^selected$/i }];
    if (req.query.company_name) and.push({ company_name: { $in: idVariants(req.query.company_name) } });
    if (req.query.stage) and.push({ stage: String(req.query.stage) });
    if (req.query.pending) and.push({ $or: DOC_CHECKLIST.map((c) => ({ [c.key]: { $nin: ['1', 1] } })) });
    if (req.query.assigned_to) and.push({ user: String(req.query.assigned_to) });
    if (req.query.joiner_type) and.push({ joiner_type: rx('^' + escapeRegex(String(req.query.joiner_type))) });
    if (req.query.docstage === 'notstarted') and.push({ $or: [{ documentation_status: { $in: ['', null] } }, { documentation_status: { $exists: false } }] });
    if (req.query.docstage === 'started') and.push({ documentation_status: 'Started' });
    if (req.query.docstage === 'cancelled') and.push({ documentation_status: 'Cancelled' });
    const q = String(req.query.q || '').trim();
    if (q) { const r = rx(q); const or = [{ indosno: r }, { passport: r }, { feedback: r }]; if (/^\d+$/.test(q)) or.push({ vacancyid: q }); and.push({ $or: or }); }
    if (req.query.from) and.push({ date: { $gte: String(req.query.from) } });
    if (req.query.to) and.push({ date: { $lte: String(req.query.to) + ' 23:59:59' } });
    const data = await proposalList({ $and: and }, req);
    const indosList = data.records.map((p) => upperIndos(p.indosno)).filter(Boolean);
    const [docs, travel] = await Promise.all([
      indosList.length ? DocumentUpload.find({ $expr: { $in: [{ $toUpper: { $ifNull: ['$indosno', ''] } }, indosList] } }).lean() : [],
      indosList.length ? TravelSchedule.find({ $expr: { $in: [{ $toUpper: { $ifNull: ['$indosno', ''] } }, indosList] } }).sort({ id: -1 }).lean() : [],
    ]);
    // The legacy page also carried a "Visa / Documents Status" cell: whether
    // the LOI is in and whether the visa itself has been received.
    const visas = indosList.length ? await LegacyKsaVisa.find({ $expr: { $in: [{ $toUpper: { $ifNull: ['$indosno', ''] } }, indosList] } }, { indosno: 1, statusin: 1, loireceiveddate: 1, visa_type: 1, ksa_id: 1 }).sort({ ksa_id: -1 }).lean() : [];
    const docBy = new Map(); for (const d of docs) if (!docBy.has(upperIndos(d.indosno))) docBy.set(upperIndos(d.indosno), d);
    const trBy = new Map(); for (const t of travel) if (!trBy.has(upperIndos(t.indosno))) trBy.set(upperIndos(t.indosno), t);
    const visaBy = new Map(); for (const v of visas) if (!visaBy.has(upperIndos(v.indosno))) visaBy.set(upperIndos(v.indosno), v);
    data.records = data.records.map((p) => {
      const d = docBy.get(upperIndos(p.indosno));
      const uploaded = d ? ['passport', 'cdc', 'coc', 'stcw', 'medical', 'covid', 'visa', 'photo', 'pscrb', 'stsdsd'].filter((k) => String(d[k] || '').trim()).length : 0;
      const done = DOC_CHECKLIST.filter((c) => String(p[c.key]) === '1').length;
      const v = visaBy.get(upperIndos(p.indosno));
      return {
        ...p,
        checklist: DOC_CHECKLIST.map((c) => ({ ...c, done: String(p[c.key]) === '1' })),
        checklistDone: done, documentsUploaded: uploaded, travel: trBy.get(upperIndos(p.indosno)) || null,
        visa: v ? { type: v.visa_type, status: String(v.statusin || '').trim(), loiReceived: isRealDate(v.loireceiveddate) } : null,
      };
    });
    const [stages, assignees] = await Promise.all([
      VacancyCandidate.distinct('stage', { status: /^selected$/i }),
      VacancyCandidate.distinct('user', { status: /^selected$/i }),
    ]);
    const clean = (a) => [...new Set(a.map((s) => String(s || '').trim()).filter(Boolean))].sort((x, y) => x.localeCompare(y));
    return res.json({ success: true, checklist: DOC_CHECKLIST, stages: clean(stages), assignees: clean(assignees), ...data });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// Cancelled joiners: proposals that were selected then withdrawn.
router.get('/cancelled-joiners', gate('cancelled_joiners.php'), async (req, res) => {
  try {
    const and = [{ status: /back ?out|rejected|reject|vacancy closed/i }];
    const q = String(req.query.q || '').trim();
    if (q) { const r = rx(q); and.push({ $or: [{ indosno: r }, { passport: r }, { remark: r }] }); }
    if (req.query.company_name) and.push({ company_name: { $in: idVariants(req.query.company_name) } });
    return res.json({ success: true, statuses: PROPOSAL_STATUS, ...(await proposalList({ $and: and }, req)) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// ===========================================================================
// POOLED CREW - the available pool: seafarers whose last contract ended and
// who are not on board now. The legacy page built this from contractnew, not
// from a table of its own, which is why it needs an endpoint rather than a
// declarative resource.
// ===========================================================================
router.get('/pooled-crew', gate('pooled_crew.php'), async (req, res) => {
  try {
    const { page, limit } = paging(req);
    // Everyone currently signed on is excluded from the pool.
    const onboard = await ContractNew.distinct('vcan_id', { signtype: 'Signon' });
    const onboardSet = new Set(onboard.map(upperIndos).filter(Boolean));

    const and = [{ signtype: 'Signoff' }, { signoffdate: { $nin: ['0000-00-00', '1000-01-01', '', null] } }];
    if (req.query.company_name) and.push({ company_name: { $in: idVariants(req.query.company_name) } });
    if (req.query.rank_id) and.push({ rank_id: { $in: idVariants(req.query.rank_id) } });
    if (req.query.vesselname) and.push({ vesselname: rx(req.query.vesselname) });
    const q = String(req.query.q || '').trim();
    if (q) { const r = rx(q); and.push({ $or: [{ fullname: r }, { vcan_id: r }, { vesselname: r }] }); }
    if (req.query.from) and.push({ davailable: { $gte: String(req.query.from) } });
    if (req.query.to) and.push({ davailable: { $lte: String(req.query.to) + '~' } });

    // One row per seafarer - their most recent sign-off - grouped in the
    // database so a page costs one round trip rather than a 4,000-row scan.
    const [grouped] = await ContractNew.aggregate([
      { $match: { $and: and } },
      { $sort: { contract_id: -1 } },
      { $group: { _id: { $toUpper: { $ifNull: ['$vcan_id', ''] } }, doc: { $first: '$$ROOT' } } },
      { $match: { _id: { $nin: ['', ...onboardSet] } } },
      { $sort: { '_id': 1 } },
      { $facet: { rows: [{ $skip: (page - 1) * limit }, { $limit: limit }], count: [{ $count: 'n' }] } },
    ]).allowDiskUse(true);
    const pageRows = (grouped?.rows || []).map((g) => g.doc);
    const total = grouped?.count?.[0]?.n || 0;
    const [resolved, people] = await Promise.all([
      resolveRows(pageRows, { company_name: 'company', rank_id: 'rank', doneby: 'staff' }),
      peopleFor(pageRows.map((r) => r.vcan_id), { name: 1, indosno: 1, email: 1, mobile: 1, rankname: 1, passport: 1, cdc: 1, coc: 1, residance_visa: 1 }),
    ]);
    const indosList = pageRows.map((r) => upperIndos(r.vcan_id)).filter(Boolean);
    const [visas, ranks] = await Promise.all([
      indosList.length ? LegacyKsaVisa.find({ $expr: { $in: [{ $toUpper: { $ifNull: ['$indosno', ''] } }, indosList] } }, { indosno: 1, visa_type: 1, visa_expiry: 1, ksa_id: 1 }).sort({ ksa_id: -1 }).lean() : [],
      optionsOf('rank'),
    ]);
    const visaBy = new Map(); for (const v of visas) if (!visaBy.has(upperIndos(v.indosno))) visaBy.set(upperIndos(v.indosno), v);

    return res.json({
      success: true, ranks,
      records: resolved.map((c) => {
        const p = people.get(upperIndos(c.vcan_id));
        const v = visaBy.get(upperIndos(c.vcan_id));
        return {
          _id: c._id, contract_id: c.contract_id, vcan_id: c.vcan_id,
          name: p?.name || c.fullname, email: p?.email || (typeof c.email === 'string' ? c.email : ''), mobile: p?.mobile || '',
          passport: p?.passport || '', cdc: p?.cdc || '', coc: p?.coc || '',
          rank: c._display.rank_id || p?.rankname || '', company: c._display.company_name, vessel: c.vesselname,
          crewOfficer: c._display.doneby || c.user || '',
          signondate: c.signondate, signoffdate: c.signoffdate, davailable: isRealDate(c.davailable) ? c.davailable : '',
          reason: c.reason, seaServiceRemark: c.rreason || c.issues_remark || '',
          nok: c.nok, nokdetails: c.nokdetails, relation: c.relation,
          residenceVisa: p?.residance_visa || '', lastVisa: v ? { type: v.visa_type, expiry: v.visa_expiry } : null,
        };
      }),
      page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// Record when a pooled seafarer becomes available (the legacy page's one edit).
router.put('/pooled-crew/:id', gate('pooled_crew.php'), async (req, res) => {
  try {
    const doc = await ContractNew.findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ success: false, message: 'Contract not found.' });
    if (req.body?.davailable !== undefined) doc.davailable = String(req.body.davailable || '').trim();
    if (req.body?.remark !== undefined) doc.rreason = String(req.body.remark || '').trim();
    await doc.save();
    return res.json({ success: true, message: 'Saved.' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// ===========================================================================
// DOCUMENTS (document_upload) - per INDOS, with uploads into uploads/bmpl-docs
// ===========================================================================
const DOC_TYPES = ['passport', 'cdc', 'coc', 'stcw', 'medical', 'covid', 'visa', 'photo', 'pscrb', 'stsdsd', 'huet', 'h2s', 'ilo', 'confined_space', 'merlin_check', 'pde', 'signature'];
const DOC_DIR = path.join(__dirname, '..', 'uploads', 'bmpl-docs');
if (!fs.existsSync(DOC_DIR)) fs.mkdirSync(DOC_DIR, { recursive: true });
const docUpload = multer({
  storage: multer.diskStorage({ destination: (req, file, cb) => cb(null, DOC_DIR), filename: (req, file, cb) => cb(null, Date.now() + '_' + String(req.params.type) + '_' + file.originalname.replace(/[^a-zA-Z0-9._-]+/g, '_')) }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => (/pdf|jpeg|jpg|png/i.test(file.mimetype) ? cb(null, true) : cb(new Error('PDF or image files only.'))),
});

router.get('/documents', gate('document_upload.php'), async (req, res) => {
  try {
    const { page, limit } = paging(req);
    const and = [];
    const indos = upperIndos(req.query.indos);
    if (indos) and.push(byIndos('indosno', indos));
    if (req.query.vacancyid) and.push({ vacancyid: String(req.query.vacancyid) });
    const filter = and.length ? { $and: and } : {};
    const [rows, total] = await Promise.all([DocumentUpload.find(filter).sort({ id: -1 }).skip((page - 1) * limit).limit(limit).lean(), DocumentUpload.countDocuments(filter)]);
    const indosList = rows.map((r) => upperIndos(r.indosno)).filter(Boolean);
    // The legacy page also showed, per row, whether the crew is on board and
    // the ticket / Form 1 / contract the documentation team uploaded against
    // the proposal, so both are joined in here.
    const [people, proposals, onboard] = await Promise.all([
      indosList.length ? LegacyVisiter.find({ $expr: { $in: [{ $toUpper: { $ifNull: ['$indosno', ''] } }, indosList] } }, { name: 1, indosno: 1, rankname: 1, email: 1, mobile: 1 }).lean() : [],
      indosList.length ? VacancyCandidate.find({ $expr: { $in: [{ $toUpper: { $ifNull: ['$indosno', ''] } }, indosList] } }, { indosno: 1, vacancyid: 1, company_name: 1, status: 1, date: 1, ticket_upload: 1, form1_upload: 1, contract_upload: 1 }).sort({ id: -1 }).lean() : [],
      indosList.length ? ContractNew.find({ $expr: { $in: [{ $toUpper: { $ifNull: ['$vcan_id', ''] } }, indosList] } }, { vcan_id: 1, vesselname: 1, signtype: 1, signondate: 1, signoffdate: 1 }).sort({ contract_id: -1 }).lean() : [],
    ]);
    const pBy = new Map(people.map((p) => [upperIndos(p.indosno), p]));
    const propBy = new Map(); for (const p of proposals) { const k = upperIndos(p.indosno); if (!propBy.has(k)) propBy.set(k, p); }
    const onBy = new Map(); for (const c of onboard) { const k = upperIndos(c.vcan_id); if (!onBy.has(k)) onBy.set(k, c); }
    const asUrl = (v) => (v && !/^file upload failed$/i.test(String(v).trim()) ? String(v).trim() : '');
    const records = rows.map((r) => {
      const key = upperIndos(r.indosno);
      const prop = propBy.get(key);
      const con = onBy.get(key);
      return {
        ...r,
        person: pBy.get(key) || null,
        onboard: con ? { vessel: con.vesselname, signtype: con.signtype, signondate: con.signondate, signoffdate: con.signoffdate } : null,
        proposalFiles: prop ? [['ticket_upload', 'Ticket'], ['form1_upload', 'Form 1'], ['contract_upload', 'Contract']].map(([k, label]) => ({ key: k, label, file: asUrl(prop[k]) })).filter((f) => f.file) : [],
        documents: DOC_TYPES.map((k) => ({ key: k, file: r[k] || '', expiry: r[k + '_expiry'] || '', url: r[k] && fs.existsSync(path.join(DOC_DIR, path.basename(String(r[k])))) ? '/uploads/bmpl-docs/' + encodeURIComponent(path.basename(String(r[k]))) : null })),
      };
    });
    return res.json({ success: true, types: DOC_TYPES, records, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.post('/documents', gate('document_upload.php'), async (req, res) => {
  try {
    const indos = upperIndos(req.body?.indosno);
    if (!indos) return res.status(400).json({ success: false, message: 'INDOS number is required.' });
    const id = await nextId(DocumentUpload, 'id');
    const doc = await DocumentUpload.create({ id, _mysqlId: id, indosno: indos, vacancyid: String(req.body?.vacancyid || ''), status: '1', is_sub: 0, user: req.user.username, cdate: nowStamp() });
    return res.status(201).json({ success: true, message: 'Document set created.', record: doc.toObject() });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.put('/documents/:id', gate('document_upload.php'), async (req, res) => {
  try {
    const doc = await DocumentUpload.findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ success: false, message: 'Record not found.' });
    for (const k of DOC_TYPES) if (req.body[k + '_expiry'] !== undefined) doc[k + '_expiry'] = String(req.body[k + '_expiry'] || '').trim() || '0000-00-00';
    await doc.save();
    return res.json({ success: true, message: 'Saved.' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.post('/documents/:id/upload/:type', gate('document_upload.php'), (req, res) => {
  if (!DOC_TYPES.includes(req.params.type)) return res.status(400).json({ success: false, message: 'Unknown document type.' });
  docUpload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    try {
      const doc = await DocumentUpload.findOne({ _id: req.params.id });
      if (!doc) return res.status(404).json({ success: false, message: 'Record not found.' });
      doc[req.params.type] = req.file.filename;
      if (req.body?.expiry) doc[req.params.type + '_expiry'] = String(req.body.expiry).trim();
      await doc.save();
      return res.json({ success: true, message: 'Uploaded.', file: req.file.filename, url: '/uploads/bmpl-docs/' + encodeURIComponent(req.file.filename) });
    } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
  });
});

// ===========================================================================
// TRAVEL DIARY (travel_schedule)
// ===========================================================================
const TRAVEL_FIELDS = ['indosno', 'travelplace', 'placeto', 'traveldate', 'arrivaldate', 'travel_details', 'ticket', 'vacancyid', 'visa', 'visa_county', 'itarranged', 'itarrangedby', 'itamount', 'itamounttype', 'ipaidto_bmpl', 'oexpensive', 'ocurrency', 'oamount', 'opaidto_bmpl', 'oremark', 'lg', 'OKTB', 'dtarranged', 'arrangedby'];
router.get('/travel', gate('Crew_travel_details.php'), async (req, res) => {
  try {
    const { page, limit } = paging(req);
    const and = [];
    const q = String(req.query.q || '').trim();
    if (q) { const r = rx(q); and.push({ $or: [{ indosno: r }, { travelplace: r }, { placeto: r }, { travel_details: r }] }); }
    if (req.query.from) and.push({ traveldate: { $gte: String(req.query.from) } });
    if (req.query.to) and.push({ traveldate: { $lte: String(req.query.to) } });
    if (req.query.upcoming) and.push({ traveldate: { $gte: today() } });
    const filter = and.length ? { $and: and } : {};
    const sort = req.query.upcoming ? { traveldate: 1 } : { id: -1 };
    const [rows, total] = await Promise.all([TravelSchedule.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(), TravelSchedule.countDocuments(filter)]);
    const indosList = rows.map((r) => upperIndos(r.indosno)).filter(Boolean);
    const people = indosList.length ? await LegacyVisiter.find({ $expr: { $in: [{ $toUpper: { $ifNull: ['$indosno', ''] } }, indosList] } }, { name: 1, indosno: 1, rankname: 1, mobile: 1 }).lean() : [];
    const pBy = new Map(people.map((p) => [upperIndos(p.indosno), p]));
    return res.json({ success: true, records: rows.map((r) => ({ ...r, person: pBy.get(upperIndos(r.indosno)) || null })), page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});
router.post('/travel', gate('Crew_travel_details.php'), async (req, res) => {
  try {
    const b = req.body || {};
    if (!upperIndos(b.indosno) || !String(b.traveldate || '').trim()) return res.status(400).json({ success: false, message: 'INDOS and travel date are required.' });
    const id = await nextId(TravelSchedule, 'id');
    const doc = { id, _mysqlId: id, user: req.user.username, doneby: req.user.username, dateenter: nowStamp(), status: '1' };
    for (const f of TRAVEL_FIELDS) if (b[f] !== undefined) doc[f] = String(b[f] ?? '').trim();
    doc.indosno = upperIndos(doc.indosno);
    const created = await TravelSchedule.create(doc);
    return res.status(201).json({ success: true, message: 'Travel entry added.', record: created.toObject() });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});
router.put('/travel/:id', gate('Crew_travel_details.php'), async (req, res) => {
  try {
    const doc = await TravelSchedule.findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ success: false, message: 'Record not found.' });
    for (const f of TRAVEL_FIELDS) if (req.body[f] !== undefined) doc[f] = String(req.body[f] ?? '').trim();
    await doc.save();
    return res.json({ success: true, message: 'Saved.' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// ===========================================================================
// CREW SIGN ON / OFF (contractnew)
// ===========================================================================
router.get('/signon', gate('signon_report.php'), async (req, res) => {
  try {
    const { page, limit } = paging(req);
    const and = [];
    if (req.query.signtype) and.push({ signtype: String(req.query.signtype) });
    if (req.query.company_name) and.push({ company_name: { $in: idVariants(req.query.company_name) } });
    if (req.query.vesselname) and.push({ vesselname: rx(req.query.vesselname) });
    if (req.query.onboard) and.push({ signtype: 'Signon' });
    const q = String(req.query.q || '').trim();
    if (q) { const r = rx(q); and.push({ $or: [{ fullname: r }, { vcan_id: r }, { vesselname: r }, { reason: r }] }); }
    // The legacy report searched on the sign-on date; entry date and sign-off
    // date are offered too, since both were asked for on other pages.
    const dateField = ['signoffdate', 'doe'].includes(req.query.dateField) ? req.query.dateField : 'signondate';
    if (req.query.from || req.query.to) {
      const asDate = {}; const asText = {};
      if (req.query.from) { asDate.$gte = new Date(String(req.query.from) + 'T00:00:00Z'); asText.$gte = String(req.query.from); }
      if (req.query.to) { asDate.$lte = new Date(String(req.query.to) + 'T23:59:59Z'); asText.$lte = String(req.query.to) + '~'; }
      and.push({ $or: [{ [dateField]: asDate }, { [dateField]: asText }] });
    }
    if (req.query.rank_id) and.push({ rank_id: { $in: idVariants(req.query.rank_id) } });
    if (req.query.joiner_type) and.push({ joiner_type: new RegExp('^' + escapeRegex(String(req.query.joiner_type)), 'i') });
    if (req.query.reason) and.push({ reason: new RegExp('^' + escapeRegex(String(req.query.reason)) + '$', 'i') });
    const filter = and.length ? { $and: and } : {};
    const [rows, total] = await Promise.all([ContractNew.find(filter).sort({ contract_id: -1 }).skip((page - 1) * limit).limit(limit).lean(), ContractNew.countDocuments(filter)]);
    const resolved = await resolveRows(rows, { company_name: 'company', rank_id: 'rank', doneby: 'staff' });
    const people = await peopleFor(rows.map((r) => r.vcan_id));
    const reasons = await ContractNew.distinct('reason', { signtype: 'Signoff' });
    return res.json({
      success: true,
      reasons: [...new Set(reasons.map((r) => String(r || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
      records: resolved.map((r) => { const p = people.get(upperIndos(r.vcan_id)); return { ...r, company: r._display.company_name, rank: r._display.rank_id, doneByName: r._display.doneby, cdc: p?.cdc || '', coc: p?.coc || '', candidateName: p?.name || r.fullname }; }),
      page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

const SIGNON_FIELDS = ['vcan_id', 'fullname', 'company_name', 'vesselname', 'rank_id', 'signondate', 'expsignoffdate', 'contractduration', 'joiner_type', 'join_type', 'donevacancy', 'txt_country', 'txt_port', 'nok', 'nokdetails', 'relation', 'address', 'dob', 'date_leave', 'date_ariveal'];
router.post('/signon', gate('signon_report.php'), async (req, res) => {
  try {
    const b = req.body || {};
    if (!upperIndos(b.vcan_id) || !String(b.vesselname || '').trim() || !String(b.signondate || '').trim()) return res.status(400).json({ success: false, message: 'INDOS, vessel and sign-on date are required.' });
    const id = await nextId(ContractNew, 'contract_id');
    const doc = { contract_id: id, _mysqlId: id, signtype: 'Signon', signon_status: '1', signoff_status: '0', doe: nowStamp(), user: req.user.username, doneby: String(req.user.bmpl?.legacy_id || req.user.username), email: '1', rstatus: '0', shipsame: '1', issues: '0', gcorrection: '1', approvaldate: new Date().toString() };
    for (const f of SIGNON_FIELDS) if (b[f] !== undefined) doc[f] = String(b[f] ?? '').trim();
    doc.vcan_id = upperIndos(doc.vcan_id);
    const created = await ContractNew.create(doc);
    return res.status(201).json({ success: true, message: 'Sign-on recorded.', record: created.toObject() });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.put('/signon/:id', gate('signon_report.php'), async (req, res) => {
  try {
    const doc = await ContractNew.findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ success: false, message: 'Record not found.' });
    for (const f of SIGNON_FIELDS) if (req.body[f] !== undefined) doc[f] = String(req.body[f] ?? '').trim();
    await doc.save();
    return res.json({ success: true, message: 'Saved.' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

router.post('/signon/:id/signoff', gate('signon_report.php'), async (req, res) => {
  try {
    const doc = await ContractNew.findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ success: false, message: 'Record not found.' });
    const b = req.body || {};
    if (!String(b.signoffdate || '').trim()) return res.status(400).json({ success: false, message: 'Sign-off date is required.' });
    doc.signtype = 'Signoff'; doc.signoff_status = '1';
    doc.signoffdate = String(b.signoffdate).trim();
    doc.reason = String(b.reason || 'Contract Completed').trim();
    doc.rreason = String(b.remark || 'SIGN OFF UPDATED').trim();
    if (b.davailable) doc.davailable = String(b.davailable).trim();
    doc.dos = nowStamp(); doc.ddos = req.user.username;
    await doc.save();
    return res.json({ success: true, message: 'Signed off.' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

export default router;
