import mongoose from 'mongoose';

// Legacy certiothers.php - other certificates and courses.
const AddCertificateSchema = new mongoose.Schema(
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
  { strict: false, collection: 'collection_addcertificate' }
);

export const AddCertificate = mongoose.models.AddCertificate || mongoose.model('AddCertificate', AddCertificateSchema);
