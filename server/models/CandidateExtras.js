import mongoose from 'mongoose';

// Reference list behind the Covid Vaccine dropdown (covid_details.php).
// Two of the eleven rows are junk with status 0; only status 1 is offered.
const VaccineNameSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: Number,
    name: { type: String, default: '' },
    dose: mongoose.Schema.Types.Mixed,
    status: mongoose.Schema.Types.Mixed,
  },
  { strict: false, collection: 'collection_vaccine_name' }
);

// Company-arranged travel (the "Travel Details ... Happy Journey" strip on
// the legacy dashboard). Keyed by INDOS; read-only for the candidate.
const TravelScheduleSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: Number,
    indosno: { type: String, default: '', index: true },
    vacancyid: mongoose.Schema.Types.Mixed,
    travelplace: { type: String, default: '' },
    placeto: { type: String, default: '' },
    traveldate: mongoose.Schema.Types.Mixed,
    arrivaldate: mongoose.Schema.Types.Mixed,
    travel_details: { type: String, default: '' },
    ticket: { type: String, default: '' },
    status: mongoose.Schema.Types.Mixed,
  },
  { strict: false, collection: 'collection_travel_schedule' }
);

// Documents the crewing team has on file for a candidate
// (candidate_uploaded_doc_view.php). One row per vacancy; each document
// type is a filename column paired with a `<type>_expiry` column.
const DocumentUploadSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: Number,
    indosno: { type: String, default: '', index: true },
    vacancyid: mongoose.Schema.Types.Mixed,
    status: mongoose.Schema.Types.Mixed,
    cdate: mongoose.Schema.Types.Mixed,
  },
  { strict: false, collection: 'collection_document_upload' }
);

export const VaccineName = mongoose.models.VaccineName || mongoose.model('VaccineName', VaccineNameSchema);
export const TravelSchedule = mongoose.models.TravelSchedule || mongoose.model('TravelSchedule', TravelScheduleSchema);
export const DocumentUpload = mongoose.models.DocumentUpload || mongoose.model('DocumentUpload', DocumentUploadSchema);
