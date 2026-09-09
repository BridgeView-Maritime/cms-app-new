import mongoose from 'mongoose';

// Legacy rename_education.php (pre-sea training section).
const PreSeaSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: Number,
    presea_name: { type: String, default: '' },
    grade: { type: String, default: '' },
    periodfrom: { type: String, default: '' },
    periodto: { type: String, default: '' },
    remarks: { type: String, default: '' },
    emailid: { type: String, default: '', index: true },
    indos: { type: String, default: '', index: true },
  },
  { strict: false, collection: 'collection_addpresea' }
);

export const PreSea = mongoose.models.PreSea || mongoose.model('PreSea', PreSeaSchema);
