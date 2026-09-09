import mongoose from 'mongoose';

// Legacy stcw.php - STCW courses.
const AddStcwSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: Number,
    certificate: { type: String, default: '' },
    number: { type: String, default: '' },
    issuedate: { type: String, default: '' },
    expdate: { type: String, default: '' },
    institute: { type: String, default: '' },
    added_date: { type: String, default: '' },
    emailid: { type: String, default: '', index: true },
    indos: { type: String, default: '', index: true },
  },
  { strict: false, collection: 'collection_addstcw' }
);

export const AddStcw = mongoose.models.AddStcw || mongoose.model('AddStcw', AddStcwSchema);
