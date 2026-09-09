import mongoose from 'mongoose';

// Legacy rename_education.php - academic qualifications.
const EducationSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: Number,
    indos: { type: String, default: '', index: true },
    degree: { type: String, default: '' },
    subject: { type: String, default: '' },
    percentage: { type: String, default: '' },
    issuedate: { type: String, default: '' },
    university: { type: String, default: '' },
    country: { type: String, default: '' },
    cemail: { type: String, default: '', index: true },
  },
  { strict: false, collection: 'collection_education' }
);

export const Education = mongoose.models.Education || mongoose.model('Education', EducationSchema);
