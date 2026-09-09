import mongoose from 'mongoose';

// Legacy certioffshore.php - offshore certificates (HUET, BOSIET, ...).
const AddOffshoreSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: Number,
    certificate: { type: String, default: '' },
    number: { type: String, default: '' },
    issuedate: { type: String, default: '' },
    expdate: { type: String, default: '' },
    regid: { type: String, default: '' },
    emailid: { type: String, default: '', index: true },
    indos: { type: String, default: '', index: true },
  },
  { strict: false, collection: 'collection_addoffshore' }
);

export const AddOffshore = mongoose.models.AddOffshore || mongoose.model('AddOffshore', AddOffshoreSchema);
