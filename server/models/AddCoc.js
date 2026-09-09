import mongoose from 'mongoose';

// Legacy addcertificate.php - Certificate of Competency records.
const AddCocSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: Number,
    coccountry: { type: String, default: '' },
    cocname: { type: String, default: '' },
    cocnumber: { type: String, default: '' },
    cocissue: { type: String, default: '' },
    cocexp: { type: String, default: '' },
    emailid: { type: String, default: '', index: true },
    indos: { type: String, default: '', index: true },
  },
  { strict: false, collection: 'collection_addcoc' }
);

export const AddCoc = mongoose.models.AddCoc || mongoose.model('AddCoc', AddCocSchema);
