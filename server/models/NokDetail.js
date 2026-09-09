import mongoose from 'mongoose';

// Legacy nok_detail.php - next of kin. Linked to a candidate by indos (or email).
const NokDetailSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: Number,
    nokname: { type: String, default: '' },
    nokrel: { type: String, default: '' },
    nokcontact: { type: String, default: '' },
    nokalternate: { type: String, default: '' },
    nokaddress: { type: String, default: '' },
    nok_emailid: { type: String, default: '' },
    relative_name: { type: String, default: '' },
    relative_contact: { type: String, default: '' },
    relative_address: { type: String, default: '' },
    reason: { type: String, default: '' },
    indos: { type: String, default: '', index: true },
    email: { type: String, default: '', index: true },
    donefrom: { type: String, default: '' },
  },
  { strict: false, collection: 'collection_nokdetails' }
);

export const NokDetail = mongoose.models.NokDetail || mongoose.model('NokDetail', NokDetailSchema);
