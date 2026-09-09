import mongoose from 'mongoose';

// Legacy contract_details.php. Each flag records whether the candidate has
// completed that part of the joining paperwork (0 = pending, 1 = done).
const ContractDetailSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: Number,
    contract: { type: Number, default: 0 },
    indeminity: { type: Number, default: 0 },
    nok: { type: Number, default: 0 },
    preemploy: { type: Number, default: 0 },
    tobacco: { type: Number, default: 0 },
    vacancyid: { type: Number, default: 0 },
    emailid: { type: String, default: '', index: true },
    indosno: { type: String, default: '', index: true },
    cdate: mongoose.Schema.Types.Mixed,
  },
  { strict: false, collection: 'collection_contract_details' }
);

export const ContractDetail = mongoose.models.ContractDetail || mongoose.model('ContractDetail', ContractDetailSchema);
