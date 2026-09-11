// The sections of the legacy "Personal Information" page (addresume.php)
// that the Registration profile does not cover, plus the four sidebar
// entries the live site gained after the code dump: Travel Document
// Details, Covid Vaccine Details, PPE Details and Candidate Uploaded
// Documents. Everything here that the candidate edits is written to
// collection_addresume under the same column names the old site used, so
// the company-side tools that read that table keep working.
import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { authenticateCandidate } from '../middleware/candidateAuthMiddleware.js';
import { candidateFilter, LINKS } from '../utils/candidateMatch.js';
import { crudSection } from '../utils/crudSection.js';
import { parseLegacyDate, applyLegacyResumeFallback } from '../utils/legacyResumeFallback.js';
import { findLegacyResumes } from '../utils/legacyCvLookup.js';
import { PHOTO_DIR, byLowerEmail, photoUrlFor } from '../utils/candidatePhoto.js';
import { AddResume } from '../models/AddResume.js';
import { AddPpe, PpeProduct, PpeRequest } from '../models/PpeModels.js';
import { VaccineName, TravelSchedule, DocumentUpload } from '../models/CandidateExtras.js';
import { NokDetail } from '../models/NokDetail.js';
import { BankDetail } from '../models/BankDetail.js';
import { Education } from '../models/Education.js';
import { PreEmployment } from '../models/PreEmployment.js';
import { AddCoc } from '../models/AddCoc.js';
import { AddStcw } from '../models/AddStcw.js';
import { CraneType, CraneMaker, CookCategory } from '../models/CandidateLookups.js';

const router = express.Router();

// ==========================================================================
// EXTENDED PROFILE - the addresume-only sections, grouped as the legacy
// page grouped them. Field names are the legacy column names.
// ==========================================================================
const SECTIONS = {
  availability: {
    text: ['availablefrom', 'availableto'],
    dates: ['availablefrom', 'availableto'],
  },
  experience: {
    text: ['presentrank', 'appliedrank', 'exprank', 'shiptype', 'skills', 'aramcoapp', 'adnocapp'],
    dates: [],
  },
  crane: {
    text: ['cranetype', 'cranemaker', 'craneoperator'],
    dates: [],
  },
  other: {
    text: ['gender', 'height', 'weight', 'language', 'english_communication'],
    dates: [],
  },
  covid: {
    text: ['vaccine', 'vaccine1', 'vaccine2', 'boostername', 'boosterdate'],
    dates: ['vaccine1', 'vaccine2', 'boosterdate'],
  },
  travel: {
    text: ['passportno', 'idate', 'expdate', 'visa', 'vidate', 'vexpdate', 'seamanbno', 'sidate', 'seamanexpdate'],
    dates: ['idate', 'expdate', 'vidate', 'vexpdate', 'sidate', 'seamanexpdate'],
  },
};

// A few of these also exist on the Registration record. They are mirrored on
// save so the two never disagree about the same fact.
const MIRROR_TO_REGISTRATION = {
  presentrank: 'rank',
  appliedrank: 'applied_rank',
  passportno: 'passport_no',
};

const YES_NO = new Set(['YES', 'NO', '']);

const isDateLike = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));

// Shapes a stored addresume row into what the client edits. Where a field
// is mirrored on Registration and addresume has nothing yet (a candidate
// who registered on the new site), the Registration value is shown so the
// form does not look blank for something they already told us.
function viewOf(row, candidate) {
  const out = {};
  for (const [section, def] of Object.entries(SECTIONS)) {
    out[section] = {};
    for (const f of def.text) {
      let raw = row ? row[f] : '';
      if ((raw === undefined || raw === null || String(raw).trim() === '') && candidate && MIRROR_TO_REGISTRATION[f]) {
        raw = candidate[MIRROR_TO_REGISTRATION[f]];
      }
      out[section][f] = def.dates.includes(f) ? parseLegacyDate(String(raw ?? '')) : (raw ?? '');
      if (out[section][f] === null) out[section][f] = '';
    }
  }
  return out;
}

async function findOrCreateAddResume(candidate) {
  let row = await AddResume.findOne(byLowerEmail(candidate.emailid));
  if (row) return row;
  // A candidate who registered on the new site has no legacy row yet.
  // Stamp it with the same identity columns the old site set so it links
  // for the old tooling as well as for us.
  return AddResume.create({
    emailid: candidate.emailid,
    regid: Number(candidate.regid) || 0,
    indosno: candidate.indosno || '',
    fullname: candidate.uname || '',
    cdate: new Date().toISOString().slice(0, 10),
    status: 1,
  });
}

router.get('/extended-profile', authenticateCandidate, async (req, res) => {
  try {
    const row = await AddResume.findOne(byLowerEmail(req.candidate.emailid)).lean();
    return res.status(200).json({
      success: true,
      sections: viewOf(row, req.candidate),
      photoUrl: photoUrlFor(row?.photo1),
      photoOnRecord: Boolean(row?.photo1),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/extended-profile', authenticateCandidate, async (req, res) => {
  try {
    const { section, values } = req.body || {};
    const def = SECTIONS[section];
    if (!def || !values || typeof values !== 'object') {
      return res.status(400).json({ success: false, message: 'Unknown section.' });
    }

    const clean = {};
    for (const f of def.text) {
      if (values[f] === undefined) continue;
      let v = String(values[f] ?? '').trim();
      if (def.dates.includes(f) && v && !isDateLike(v)) {
        return res.status(400).json({ success: false, message: 'Dates must be in YYYY-MM-DD form.' });
      }
      if ((f === 'aramcoapp' || f === 'adnocapp') && !YES_NO.has(v.toUpperCase())) {
        return res.status(400).json({ success: false, message: 'Approval must be YES or NO.' });
      }
      if (f === 'aramcoapp' || f === 'adnocapp') v = v.toUpperCase();
      clean[f] = v;
    }

    const row = await findOrCreateAddResume(req.candidate);
    Object.assign(row, clean);
    await row.save();

    let mirrored = false;
    for (const [from, to] of Object.entries(MIRROR_TO_REGISTRATION)) {
      if (clean[from] !== undefined && req.candidate[to] !== clean[from]) {
        req.candidate[to] = clean[from];
        mirrored = true;
      }
    }
    if (mirrored) await req.candidate.save();

    return res.status(200).json({ success: true, message: 'Saved.', sections: viewOf(row.toObject(), req.candidate) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Dropdown sources for the extended sections.
router.get('/extended-profile/options', async (req, res) => {
  try {
    const [vaccines, craneTypes, craneMakers, cookSkills] = await Promise.all([
      VaccineName.find({}).lean(),
      CraneType.find({}).lean(),
      CraneMaker.find({}).lean(),
      CookCategory.find({}).lean(),
    ]);
    const live = (rows) => rows.filter((r) => r.status === undefined || String(r.status) === '1');
    const names = (rows, f) => [...new Set(rows.map((r) => String(r[f] || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
    return res.status(200).json({
      success: true,
      vaccines: names(live(vaccines), 'name'),
      craneTypes: names(live(craneTypes), 'crane_type'),
      craneMakers: names(live(craneMakers), 'crane_maker'),
      cookingSkills: names(cookSkills, 'cookskill'),
      englishLevels: ['Excellent', 'Good', 'Average', 'Poor'],
      genders: ['Male', 'Female', 'Other'],
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================================================
// PHOTO - JPEG/PNG under 2MB. Stored under uploads/photos and recorded in
// addresume.photo1, the column the old site used for the same thing.
// ==========================================================================
if (!fs.existsSync(PHOTO_DIR)) fs.mkdirSync(PHOTO_DIR, { recursive: true });

const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const photoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PHOTO_DIR),
    filename: (req, file, cb) => {
      const owner = req.candidate?.regid || req.candidate?._id;
      cb(null, owner + '-' + Date.now() + IMAGE_TYPES[file.mimetype]);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!IMAGE_TYPES[file.mimetype]) return cb(new Error('Please upload a JPEG or PNG image.'));
    cb(null, true);
  },
});

const removeStoredPhoto = (filename) => {
  if (!filename) return;
  const safe = path.basename(String(filename));
  const p = path.join(PHOTO_DIR, safe);
  // Only files this app wrote are ever deleted; a legacy filename that
  // happens not to exist here is simply left alone.
  if (fs.existsSync(p)) fs.unlinkSync(p);
};

router.post('/photo', authenticateCandidate, (req, res) => {
  photoUpload.single('photo')(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded.' });
    try {
      const row = await findOrCreateAddResume(req.candidate);
      const previous = row.photo1;
      row.photo1 = req.file.filename;
      await row.save();
      if (previous && previous !== req.file.filename) removeStoredPhoto(previous);
      return res.status(200).json({ success: true, message: 'Photo updated.', photoUrl: photoUrlFor(row.photo1) });
    } catch (saveErr) {
      removeStoredPhoto(req.file.filename);
      return res.status(500).json({ success: false, message: saveErr.message });
    }
  });
});

router.delete('/photo', authenticateCandidate, async (req, res) => {
  try {
    const row = await AddResume.findOne(byLowerEmail(req.candidate.emailid));
    if (row && row.photo1) {
      const previous = row.photo1;
      row.photo1 = '';
      await row.save();
      removeStoredPhoto(previous);
    }
    return res.status(200).json({ success: true, message: 'Photo removed.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================================================
// PPE DETAILS - the candidate's sizes (editable) and the company's order
// history for them (read-only).
// ==========================================================================
crudSection({
  router,
  path: '/ppe',
  model: AddPpe,
  link: LINKS.addppe,
  fields: ['product_name', 'product_size'],
});

router.get('/ppe-options', async (req, res) => {
  try {
    const rows = await PpeProduct.find({}).sort({ id: 1 }).lean();
    const products = rows
      .filter((r) => String(r.status) === '1' && String(r.product || '').trim())
      .map((r) => ({
        name: String(r.product).trim(),
        sizes: String(r.size || '').split(',').map((s) => s.trim()).filter((s) => s && s !== '-'),
      }));
    return res.status(200).json({ success: true, products });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/ppe-orders', authenticateCandidate, async (req, res) => {
  try {
    const rows = await PpeRequest.find(candidateFilter(req.candidate, LINKS.ppe_request)).sort({ id: -1 }).lean();
    const records = rows.map((r) => ({
      _id: r._id,
      product: String(r.product || '').trim(),
      size: String(r.product_size || '').trim(),
      quantity: r.product_quantity ?? '',
      vessel: String(r.vesselname || '').trim(),
      status: String(r.product_status || '').trim(),
      date: r.cdate || null,
    }));
    return res.status(200).json({ success: true, records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================================================
// CANDIDATE UPLOADED DOCUMENTS - what the crewing team has on file.
// Read-only; the files themselves were not part of the migration, so each
// entry says whether it can be opened.
// ==========================================================================
const DOCUMENT_TYPES = [
  ['passport', 'Passport'], ['cdc', 'CDC'], ['coc', 'COC'], ['stcw', 'STCW'],
  ['medical', 'Medical'], ['covid', 'Covid Certificate'], ['visa', 'Visa'],
  ['photo', 'Photograph'], ['pscrb', 'PSCRB'], ['stsdsd', 'STSDSD'], ['huet', 'HUET'],
  ['h2s', 'H2S'], ['ilo', 'ILO Medical'], ['confined_space', 'Confined Space'],
  ['merlin_check', 'Merlin Check'], ['pde', 'PDE'], ['signature', 'Signature'],
];

router.get('/documents', authenticateCandidate, async (req, res) => {
  try {
    const indos = String(req.candidate.indosno || '').trim();
    if (!indos) return res.status(200).json({ success: true, records: [], needsIndos: true });

    const rows = await DocumentUpload.find({
      $and: [
        { $expr: { $eq: [{ $toUpper: { $ifNull: ['$indosno', ''] } }, indos.toUpperCase()] } },
        { status: { $in: ['1', 1] } },
      ],
    }).sort({ id: -1 }).lean();

    const records = rows.map((r) => ({
      _id: r._id,
      vacancyId: r.vacancyid || null,
      date: r.cdate || null,
      documents: DOCUMENT_TYPES
        .filter(([key]) => String(r[key] || '').trim())
        .map(([key, label]) => ({
          key,
          label,
          filename: String(r[key]).trim(),
          expiry: parseLegacyDate(String(r[key + '_expiry'] || '')) || null,
          // Files were kept under the old site's uploads/upload_docs, which
          // was not carried over - so nothing here is downloadable yet.
          available: false,
        })),
    })).filter((r) => r.documents.length);

    return res.status(200).json({ success: true, records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================================================
// TRAVEL SCHEDULE - company-arranged travel, shown on the dashboard.
// ==========================================================================
async function recentTravel(candidate, limit = 5) {
  const indos = String(candidate.indosno || '').trim();
  if (!indos) return [];
  const rows = await TravelSchedule.find({
    $expr: { $eq: [{ $toUpper: { $ifNull: ['$indosno', ''] } }, indos.toUpperCase()] },
  }).sort({ id: -1 }).limit(limit).lean();
  return rows.map((r) => ({
    _id: r._id,
    from: String(r.travelplace || '').trim(),
    to: String(r.placeto || '').trim(),
    date: parseLegacyDate(String(r.traveldate || '')) || null,
    arrival: parseLegacyDate(String(r.arrivaldate || '')) || null,
    details: String(r.travel_details || '').trim(),
  }));
}

// The legacy dashboard showed the newest travel row whatever its date, so a
// trip from two years ago still read "Happy journey". Only travel that is
// ahead, or within the last week, is worth a banner.
async function upcomingTravel(candidate) {
  const cutoff = Date.now() - 7 * 86400000;
  return (await recentTravel(candidate, 10))
    .filter((t) => t.date && new Date(t.date).getTime() >= cutoff)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);
}

router.get('/travel-schedule', authenticateCandidate, async (req, res) => {
  try {
    return res.status(200).json({ success: true, records: await recentTravel(req.candidate) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================================================
// DASHBOARD SUMMARY - how complete each section of the profile is, so the
// dashboard can put the gaps in front of the candidate.
// ==========================================================================
const filled = (v) => !(v === undefined || v === null || String(v).trim() === '' || (Array.isArray(v) && !v.length));
const countFilled = (obj, keys) => keys.filter((k) => filled(obj?.[k])).length;

router.get('/dashboard', authenticateCandidate, async (req, res) => {
  try {
    const c = req.candidate;
    // The Registration view with legacy values filled in, the same way
    // /me presents it - so completeness matches what the forms show.
    const reg = await applyLegacyResumeFallback(c.toObject());
    const row = await AddResume.findOne(byLowerEmail(c.emailid)).lean();
    const ext = viewOf(row, c);

    const [nok, bank, edu, employers, coc, stcw, ppe, travel, legacyCvs] = await Promise.all([
      NokDetail.countDocuments(candidateFilter(c, LINKS.nokdetails)),
      BankDetail.countDocuments(candidateFilter(c, LINKS.bank_details)),
      Education.countDocuments(candidateFilter(c, LINKS.education)),
      PreEmployment.countDocuments(candidateFilter(c, LINKS.preemployment)),
      AddCoc.countDocuments(candidateFilter(c, LINKS.addcoc)),
      AddStcw.countDocuments(candidateFilter(c, LINKS.addstcw)),
      AddPpe.countDocuments(candidateFilter(c, LINKS.addppe)),
      upcomingTravel(c),
      findLegacyResumes(c.emailid),
    ]);

    const hasCv = (c.resumes && c.resumes.length > 0) || legacyCvs.some((r) => r.available) || legacyCvs.length > 0;
    const photoUrl = photoUrlFor(row?.photo1);

    const PERSONAL = ['uname', 'dob', 'phoneno', 'address', 'city', 'state', 'countryname', 'indosno'];
    const TRAVEL_REQ = ['passportno', 'idate', 'expdate', 'seamanbno', 'sidate', 'seamanexpdate'];

    // `required` sections drive the overall percentage; the rest are shown
    // but never count against the candidate.
    const sections = [
      { key: 'photo', label: 'Profile Photo', to: '/candidate/profile#photo', filled: photoUrl ? 1 : 0, total: 1, required: true },
      { key: 'cv', label: 'Your CV', to: '/candidate/resume', filled: hasCv ? 1 : 0, total: 1, required: true },
      { key: 'personal', label: 'Personal Information', to: '/candidate/profile', filled: countFilled(reg, PERSONAL), total: PERSONAL.length, required: true },
      { key: 'experience', label: 'Experience Details', to: '/candidate/profile#experience', filled: countFilled(ext.experience, ['presentrank', 'appliedrank', 'exprank', 'shiptype']), total: 4, required: true },
      { key: 'other', label: 'Other Details', to: '/candidate/profile#other', filled: countFilled(ext.other, SECTIONS.other.text), total: SECTIONS.other.text.length, required: true },
      { key: 'availability', label: 'Availability', to: '/candidate/profile#availability', filled: countFilled(ext.availability, SECTIONS.availability.text), total: 2, required: true },
      { key: 'travel', label: 'Travel Documents', to: '/candidate/travel-documents', filled: countFilled(ext.travel, TRAVEL_REQ), total: TRAVEL_REQ.length, required: true },
      { key: 'covid', label: 'Covid Vaccine', to: '/candidate/covid-vaccine', filled: countFilled(ext.covid, ['vaccine', 'vaccine1']), total: 2, required: true },
      { key: 'nok', label: 'NOK Details', to: '/candidate/nok', filled: nok ? 1 : 0, total: 1, required: true },
      { key: 'bank', label: 'Bank Details', to: '/candidate/bank-details', filled: bank ? 1 : 0, total: 1, required: true },
      { key: 'qualification', label: 'Qualification', to: '/candidate/qualification', filled: edu ? 1 : 0, total: 1, required: true },
      { key: 'stcw', label: 'STCW', to: '/candidate/stcw', filled: stcw ? 1 : 0, total: 1, required: true },
      { key: 'coc', label: 'Certificate of Competency', to: '/candidate/coc', filled: coc ? 1 : 0, total: 1, required: false },
      { key: 'employers', label: 'Previous Employers', to: '/candidate/previous-employers', filled: employers ? 1 : 0, total: 1, required: false },
      { key: 'crane', label: 'Crane Experience', to: '/candidate/profile#crane', filled: countFilled(ext.crane, SECTIONS.crane.text), total: 3, required: false },
      { key: 'ppe', label: 'PPE Sizes', to: '/candidate/ppe', filled: ppe ? 1 : 0, total: 1, required: false },
    ].map((s) => ({ ...s, complete: s.filled >= s.total }));

    const req_ = sections.filter((s) => s.required);
    const done = req_.reduce((n, s) => n + s.filled, 0);
    const total = req_.reduce((n, s) => n + s.total, 0);

    return res.status(200).json({
      success: true,
      overall: total ? Math.round((done / total) * 100) : 0,
      requiredRemaining: req_.filter((s) => !s.complete).length,
      sections,
      photoUrl,
      travel,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
