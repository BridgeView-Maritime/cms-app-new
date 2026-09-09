import express from 'express';
import bcrypt from 'bcryptjs';
import { authenticateCandidate } from '../middleware/candidateAuthMiddleware.js';
import { candidateFilter, ownershipFields, LINKS } from '../utils/candidateMatch.js';
import { crudSection } from '../utils/crudSection.js';
import { JobPost } from '../models/JobPost.js';
import { SaveJob } from '../models/SaveJob.js';
import { AppliedJob } from '../models/AppliedJob.js';
import { ContractDetail } from '../models/ContractDetail.js';
import { Grievance } from '../models/Grievance.js';
import { Vacancy } from '../models/Vacancy.js';
import { VacancyCandidate } from '../models/VacancyCandidate.js';

const router = express.Router();

// ==========================================================================
// JOB BOARD (Phase 4)
// ==========================================================================

// The legacy `jobtitle` column is empty on every row; the position is held
// in `rankid`, which despite the name stores the rank NAME as free text.
const jobTitle = (j) => String(j.jobtitle || '').trim() || String(j.rankid || '').trim() || 'Position';

const normalizeJob = (j) => ({
  _id: j._id,
  jobid: j.jobid,
  title: jobTitle(j),
  company: String(j.companyname || '').trim(),
  area: String(j.jobarea || '').trim(),
  shipType: String(j.shiptype || '').trim(),
  vesselType: String(j.vesseltype || '').trim(),
  nationality: String(j.nationality || '').trim(),
  contract: String(j.contract || '').trim(),
  salary: String(j.salary || '').trim(),
  description: String(j.description || '').trim(),
  requirements: String(j.requirements || '').trim(),
  cmsJobId: j.cms_jobid || null,
  postedOn: j.postdate || null,
});

// Case-insensitive "contains", expressed without a regex so no user input
// ever has to be escaped into one.
const containsAny = (fields, term) => ({
  $or: fields.map((f) => ({
    $expr: { $gte: [{ $indexOfCP: [{ $toLower: { $ifNull: ['$' + f, ''] } }, term] }, 0] },
  })),
});

const equalsCI = (field, value) => ({
  $expr: { $eq: [{ $toLower: { $ifNull: ['$' + field, ''] } }, value.toLowerCase()] },
});

// Only status '1' postings are live; '0' are closed vacancies.
const LIVE = { status: '1' };

// GET /jobs - the browse/search list. Public: candidates should be able to
// see what is on offer before deciding to log in.
router.get('/jobs', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));

    const and = [LIVE];
    const search = String(req.query.search || '').trim().toLowerCase();
    if (search) and.push(containsAny(['rankid', 'companyname', 'jobarea', 'shiptype', 'vesseltype'], search));
    for (const [param, field] of [['shipType', 'shiptype'], ['area', 'jobarea'], ['vesselType', 'vesseltype']]) {
      const v = String(req.query[param] || '').trim();
      if (v) and.push(equalsCI(field, v));
    }

    const filter = and.length === 1 ? and[0] : { $and: and };

    const [rows, total] = await Promise.all([
      JobPost.find(filter).sort({ jobid: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      JobPost.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      records: rows.map(normalizeJob),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Distinct values for the filter dropdowns, taken from live postings only so
// the filters can never offer a combination that returns nothing.
router.get('/jobs/filters', async (req, res) => {
  try {
    const clean = (values) => {
      const seen = new Set();
      const out = [];
      for (const v of values) {
        const t = String(v || '').trim();
        if (!t) continue;
        const k = t.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(t);
      }
      return out.sort((a, b) => a.localeCompare(b));
    };

    const [shipTypes, areas, vesselTypes] = await Promise.all([
      JobPost.distinct('shiptype', LIVE),
      JobPost.distinct('jobarea', LIVE),
      JobPost.distinct('vesseltype', LIVE),
    ]);

    return res.status(200).json({
      success: true,
      shipTypes: clean(shipTypes),
      areas: clean(areas),
      vesselTypes: clean(vesselTypes),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// The set of job ids this candidate has already saved or applied to, so the
// list can render the right button state without a request per card.
router.get('/jobs/my-activity', authenticateCandidate, async (req, res) => {
  try {
    const [saved, applied] = await Promise.all([
      SaveJob.find(candidateFilter(req.candidate, LINKS.savejob)).select('jobpostid').lean(),
      AppliedJob.find(candidateFilter(req.candidate, LINKS.appliedjobs)).select('post').lean(),
    ]);
    return res.status(200).json({
      success: true,
      savedJobIds: saved.map((r) => Number(r.jobpostid)).filter(Number.isFinite),
      appliedJobIds: applied.map((r) => Number(r.post)).filter(Number.isFinite),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

const findLiveJob = (jobid) => JobPost.findOne({ jobid: Number(jobid), ...LIVE }).lean();

router.post('/jobs/:jobid/save', authenticateCandidate, async (req, res) => {
  try {
    const job = await findLiveJob(req.params.jobid);
    if (!job) return res.status(404).json({ success: false, message: 'This job is no longer listed.' });

    const scope = candidateFilter(req.candidate, LINKS.savejob);
    const existing = await SaveJob.findOne({ $and: [{ jobpostid: job.jobid }, scope] });
    if (existing) return res.status(200).json({ success: true, message: 'Already saved.' });

    await SaveJob.create({
      jobpostid: job.jobid,
      cdate: new Date().toISOString().slice(0, 10),
      ...ownershipFields(req.candidate, LINKS.savejob),
    });
    return res.status(201).json({ success: true, message: 'Job saved.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/jobs/:jobid/save', authenticateCandidate, async (req, res) => {
  try {
    const scope = candidateFilter(req.candidate, LINKS.savejob);
    const removed = await SaveJob.findOneAndDelete({
      $and: [{ jobpostid: Number(req.params.jobid) }, scope],
    });
    if (!removed) return res.status(404).json({ success: false, message: 'This job was not in your saved list.' });
    return res.status(200).json({ success: true, message: 'Removed from saved jobs.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/jobs/:jobid/apply', authenticateCandidate, async (req, res) => {
  try {
    const job = await findLiveJob(req.params.jobid);
    if (!job) return res.status(404).json({ success: false, message: 'This job is no longer listed.' });

    const scope = candidateFilter(req.candidate, LINKS.appliedjobs);
    const existing = await AppliedJob.findOne({ $and: [{ post: String(job.jobid) }, scope] });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You have already applied for this job.' });
    }

    await AppliedJob.create({
      post: String(job.jobid),
      vessel: job.vesseltype || job.shiptype || '',
      regid: req.candidate.regid || '',
      adate: new Date().toISOString().slice(0, 10),
      status: 1,
      ...ownershipFields(req.candidate, LINKS.appliedjobs),
    });
    return res.status(201).json({ success: true, message: 'Application submitted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Attaches the job posting to each of `rows`. Postings from years back have
 * been purged from `jobpost`, so a row whose reference no longer resolves is
 * still returned - flagged as unavailable rather than silently dropped,
 * which would make a candidate history look shorter than it really is.
 */
async function withJobs(rows, refField) {
  const ids = [...new Set(rows.map((r) => Number(r[refField])).filter(Number.isFinite))];
  const jobs = ids.length ? await JobPost.find({ jobid: { $in: ids } }).lean() : [];
  const byId = new Map(jobs.map((j) => [Number(j.jobid), normalizeJob(j)]));

  return rows.map((r) => {
    const job = byId.get(Number(r[refField])) || null;
    return {
      _id: r._id,
      jobid: Number(r[refField]) || null,
      date: r.cdate || r.adate || null,
      job,
      jobAvailable: Boolean(job),
    };
  });
}

router.get('/saved-jobs', authenticateCandidate, async (req, res) => {
  try {
    const rows = await SaveJob.find(candidateFilter(req.candidate, LINKS.savejob)).sort({ id: -1 }).lean();
    const records = await withJobs(rows, 'jobpostid');
    return res.status(200).json({ success: true, records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/saved-jobs/:id', authenticateCandidate, async (req, res) => {
  try {
    const scope = candidateFilter(req.candidate, LINKS.savejob);
    const removed = await SaveJob.findOneAndDelete({ $and: [{ _id: req.params.id }, scope] });
    if (!removed) return res.status(404).json({ success: false, message: 'Record not found.' });
    return res.status(200).json({ success: true, message: 'Removed from saved jobs.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * `appliedjobs.status` is 1 on all 12,992 rows - it is an active flag, not
 * a workflow state. Real progress lives in `vacanciescandidate`, keyed by
 * INDOS number and vacancy id, exactly as the legacy appliedjobs.php reads
 * it. The stored values are inconsistently cased and spaced, so they are
 * normalized here; anything unrecognized stays at plain "Applied" rather
 * than being reported as something it might not be.
 */
const PROGRESS = new Map([
  ['pending', 'Under Process'],
  ['selected', 'Selected'],
  ['selected on different vacancy', 'Selected (Other Vacancy)'],
  ['rejected', 'Not Selected'],
  ['reject', 'Not Selected'],
  ['backout', 'Withdrawn'],
  ['back out', 'Withdrawn'],
  ['vacancy closed', 'Vacancy Closed'],
]);

const progressLabel = (raw) => PROGRESS.get(String(raw || '').trim().toLowerCase()) || null;

// Ids cross tables as numbers in one place and strings in another, so match
// on both rather than assuming either.
const bothTypes = (values) => {
  const out = new Set();
  for (const v of values) {
    if (v === null || v === undefined || v === '') continue;
    out.add(String(v));
    const n = Number(v);
    if (Number.isFinite(n)) out.add(n);
  }
  return [...out];
};

router.get('/applied-jobs', authenticateCandidate, async (req, res) => {
  try {
    const rows = await AppliedJob.find(candidateFilter(req.candidate, LINKS.appliedjobs)).sort({ id: -1 }).lean();
    const withJob = await withJobs(rows, 'post');

    // The vacancy behind each posting: jobpost.cms_jobid -> vacancies.id,
    // which is also vacanciescandidate.vacancyid.
    const cmsIds = bothTypes(withJob.map((r) => r.job?.cmsJobId));
    const indos = String(req.candidate.indosno || '').trim();

    const [vacancies, progressRows] = await Promise.all([
      cmsIds.length ? Vacancy.find({ id: { $in: cmsIds } }).lean() : [],
      indos && cmsIds.length
        ? VacancyCandidate.find({
            $and: [
              { vacancyid: { $in: cmsIds } },
              { $expr: { $eq: [{ $toUpper: { $ifNull: ['$indosno', ''] } }, indos.toUpperCase()] } },
            ],
          }).lean()
        : [],
    ]);

    const closedVacancies = new Set(
      vacancies.filter((v) => String(v.exp || '').trim().toLowerCase() === 'close').map((v) => String(v.id))
    );
    const progressByVacancy = new Map(progressRows.map((r) => [String(r.vacancyid), r]));

    const records = withJob.map((r, i) => {
      const cms = r.job?.cmsJobId ? String(r.job.cmsJobId) : null;
      const progress = cms ? progressByVacancy.get(cms) : null;

      // Legacy order of precedence: a closed vacancy wins over any progress.
      let status = 'Applied';
      let statusDate = null;
      if (progress) {
        if (cms && closedVacancies.has(cms)) {
          status = 'Vacancy Closed';
        } else {
          const label = progressLabel(progress.status);
          if (label) {
            status = label;
            statusDate = label === 'Under Process' ? progress.pending_date : progress.date;
          }
        }
      }

      return {
        ...r,
        vessel: String(rows[i].vessel || '').trim(),
        appliedOn: rows[i].adate || null,
        status,
        statusDate: statusDate || null,
      };
    });

    return res.status(200).json({ success: true, records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================================================
// CONTRACT DETAILS (Phase 5) - read-only
//
// Despite the name this is not a set of documents: each row is the joining
// paperwork checklist for one vacancy, with a 0/1 flag per item.
// ==========================================================================
const CHECKLIST = [
  { key: 'contract', label: 'Contract of Employment' },
  { key: 'indeminity', label: 'Indemnity Form' },
  { key: 'nok', label: 'Next of Kin Declaration' },
  { key: 'preemploy', label: 'Pre-Employment Declaration' },
  { key: 'tobacco', label: 'Drug, Alcohol and Tobacco Policy' },
];

router.get('/contract-details', authenticateCandidate, async (req, res) => {
  try {
    const rows = await ContractDetail.find(candidateFilter(req.candidate, LINKS.contract_details))
      .sort({ id: -1 })
      .lean();

    const records = rows.map((r) => {
      const items = CHECKLIST.map((c) => ({ ...c, done: Number(r[c.key]) === 1 }));
      return {
        _id: r._id,
        vacancyId: r.vacancyid || null,
        date: r.cdate || null,
        items,
        completed: items.filter((i) => i.done).length,
        total: items.length,
      };
    });

    return res.status(200).json({ success: true, records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================================================
// GRIEVANCES (Phase 5) - candidate-owned CRUD
// ==========================================================================
crudSection({
  router,
  path: '/grievances',
  model: Grievance,
  link: LINKS.grievance,
  fields: ['g_title', 'g_remark'],
});

// ==========================================================================
// CHANGE PASSWORD (Phase 5)
// ==========================================================================
router.post('/change-password', authenticateCandidate, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }
    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New passwords do not match.' });
    }

    const candidate = req.candidate;
    const stored = String(candidate.password || '');
    // Accounts that have not logged in since the bcrypt migration still hold
    // a plain-text password, exactly as the login route handles it.
    const isHashed = stored.startsWith('$2');
    const ok = isHashed ? await bcrypt.compare(currentPassword, stored) : currentPassword === stored;
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Your current password is incorrect.' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: 'Your new password must be different from your current one.' });
    }

    const salt = await bcrypt.genSalt(10);
    candidate.password = await bcrypt.hash(newPassword, salt);
    candidate.repassword = candidate.password;
    await candidate.save();

    return res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
