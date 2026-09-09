import mongoose from 'mongoose';

// Legacy select_sea_service.php. Sea time comes from two company-managed
// contract tables, so these are read-only for candidates.
//
// Linking is awkward in the source data: `contractnew` mostly carries the
// candidate's `email`, while `shipcontractnew` almost never does (327 of
// 50,500) and instead identifies the candidate by INDOS number in
// `vcan_id`. Both are matched on — see utils/candidateMatch.js.
const base = {
  _mysqlId: Number,
  contract_id: Number,
  vcan_id: { type: String, default: '', index: true },
  fullname: { type: String, default: '' },
  company_name: { type: String, default: '' },
  vesselname: { type: String, default: '' },
  vesseltype: { type: String, default: '' },
  rank_id: { type: String, default: '' },
  contractduration: { type: String, default: '' },
  signondate: mongoose.Schema.Types.Mixed,
  signoffdate: mongoose.Schema.Types.Mixed,
  joiner_type: { type: String, default: '' },
  join_type: { type: String, default: '' },
};

const ContractNewSchema = new mongoose.Schema(
  { ...base, email: { type: String, default: '', index: true } },
  { strict: false, collection: 'collection_contractnew' }
);

const ShipContractNewSchema = new mongoose.Schema(
  { ...base, emp_email: { type: String, default: '', index: true }, emp_name: { type: String, default: '' }, imo: { type: String, default: '' } },
  { strict: false, collection: 'collection_shipcontractnew' }
);

export const ContractNew = mongoose.models.ContractNew || mongoose.model('ContractNew', ContractNewSchema);
export const ShipContractNew = mongoose.models.ShipContractNew || mongoose.model('ShipContractNew', ShipContractNewSchema);
