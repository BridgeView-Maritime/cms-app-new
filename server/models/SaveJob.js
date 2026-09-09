import mongoose from 'mongoose';

// Legacy savejobs.php. `jobpostid` references JobPost.jobid — older rows
// point at postings that were purged, so a join can legitimately miss.
const SaveJobSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: Number,
    jobpostid: { type: Number, index: true },
    emailid: { type: String, default: '', index: true },
    indosno: { type: String, default: '', index: true },
    cdate: { type: String, default: '' },
  },
  { strict: false, collection: 'collection_savejob' }
);

export const SaveJob = mongoose.models.SaveJob || mongoose.model('SaveJob', SaveJobSchema);
