import mongoose from 'mongoose';

// Where a candidate actually stands on a vacancy. This — not
// `appliedjobs.status`, which is 1 on every row — is what the legacy
// applied-jobs page reads to show "Under Process" / "Selected".
//
// It is keyed by INDOS number and `vacancyid` (= jobpost.cms_jobid), so a
// candidate without an INDOS simply has no progress to show.
const VacancyCandidateSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: Number,
    status: { type: String, default: '' },
    date: mongoose.Schema.Types.Mixed,
    pending_date: mongoose.Schema.Types.Mixed,
    rej_date: mongoose.Schema.Types.Mixed,
    indosno: { type: String, default: '', index: true },
    vacancyid: { type: mongoose.Schema.Types.Mixed, index: true },
    remark: { type: String, default: '' },
    joiner_type: { type: String, default: '' },
    email: { type: String, default: '' },
  },
  { strict: false, collection: 'collection_vacanciescandidate' }
);

export const VacancyCandidate =
  mongoose.models.VacancyCandidate || mongoose.model('VacancyCandidate', VacancyCandidateSchema);
