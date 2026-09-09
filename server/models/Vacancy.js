import mongoose from 'mongoose';

// The internal (bridgeoffic) vacancy behind a public job post. A posting
// links to it by `jobpost.cms_jobid` -> `vacancies.id`. `exp` is the
// open/closed flag the legacy applied-jobs page checks first.
const VacancySchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: { type: Number, index: true },
    exp: { type: String, default: '' },
    company_name: { type: String, default: '' },
    rankname: { type: String, default: '' },
    jlocation: { type: String, default: '' },
    vesseltype: { type: String, default: '' },
    dov: mongoose.Schema.Types.Mixed,
  },
  { strict: false, collection: 'collection_vacancies' }
);

export const Vacancy = mongoose.models.Vacancy || mongoose.model('Vacancy', VacancySchema);
