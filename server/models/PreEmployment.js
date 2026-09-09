import mongoose from 'mongoose';

// Legacy previousemp.php - previous employer history.
const PreEmploymentSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: Number,
    compname: { type: String, default: '' },
    persname: { type: String, default: '' },
    mobileno: { type: String, default: '' },
    preemailid: { type: String, default: '' },
    indosno: { type: String, default: '', index: true },
    emailid: { type: String, default: '', index: true },
  },
  { strict: false, collection: 'collection_preemployment' }
);

export const PreEmployment = mongoose.models.PreEmployment || mongoose.model('PreEmployment', PreEmploymentSchema);
