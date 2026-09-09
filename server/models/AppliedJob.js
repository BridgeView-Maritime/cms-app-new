import mongoose from 'mongoose';

// Legacy appliedjobs.php. `post` references JobPost.jobid (stored as a
// string); `vessel` holds the vessel type applied for.
const AppliedJobSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: Number,
    post: { type: String, default: '', index: true },
    vessel: { type: String, default: '' },
    comid: { type: Number, default: 0 },
    resumeid: Number,
    regid: { type: String, default: '' },
    emailid: { type: String, default: '', index: true },
    adate: { type: String, default: '' },
    status: mongoose.Schema.Types.Mixed,
  },
  { strict: false, collection: 'collection_appliedjobs' }
);

export const AppliedJob = mongoose.models.AppliedJob || mongoose.model('AppliedJob', AppliedJobSchema);
