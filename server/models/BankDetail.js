import mongoose from 'mongoose';

// Legacy bank_details.php. Exactly one record per candidate in the source data.
const BankDetailSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: Number,
    name: { type: String, default: '' },
    accountno: { type: String, default: '' },
    code: { type: String, default: '' },
    bank_name: { type: String, default: '' },
    bank_address: { type: String, default: '' },
    emailid: { type: String, default: '', index: true },
    indosno: { type: String, default: '', index: true },
  },
  { strict: false, collection: 'collection_bank_details' }
);

export const BankDetail = mongoose.models.BankDetail || mongoose.model('BankDetail', BankDetailSchema);
