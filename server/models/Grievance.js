import mongoose from 'mongoose';

// Legacy grievances.php. `status` 1 = open, and doc_1/doc_2 hold filenames
// of any documents the candidate attached on the old site.
const GrievanceSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: Number,
    g_title: { type: String, default: '' },
    g_remark: { type: String, default: '' },
    g_close_remark: { type: String, default: '' },
    doc_1: { type: String, default: '' },
    doc_2: { type: String, default: '' },
    status: mongoose.Schema.Types.Mixed,
    emailid: { type: String, default: '', index: true },
    indosno: { type: String, default: '', index: true },
    cdate: mongoose.Schema.Types.Mixed,
  },
  { strict: false, collection: 'collection_grievance' }
);

export const Grievance = mongoose.models.Grievance || mongoose.model('Grievance', GrievanceSchema);
