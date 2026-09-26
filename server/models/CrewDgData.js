import mongoose from 'mongoose';

// "Pending Issues with DG" (legacy pendingissuewithdg.php, table crew_dg_data).
// The table was created on the live site after the last MySQL backup, so
// there is nothing to migrate: this is the schema the legacy page wrote.
const CrewDgDataSchema = new mongoose.Schema(
  {
    _mysqlId: { type: Number, index: true },
    id: { type: Number, index: true },
    crew_name: { type: String, default: '' },
    cdc_indos_no: { type: String, default: '' },
    indos_no: { type: String, default: '', index: true },
    correct_data: { type: String, default: '' },
    wrong_update_in_dgrpsl: { type: String, default: '' },
    correction_amount: { type: Number, default: 0 },
    bharat_kosh_transaction_id: { type: String, default: '' },
    dgs_status: { type: String, default: 'Pending' }, // Pending | Submitted | Corrected | Rejected
    record_date: { type: String, default: '' }, // YYYY-MM-DD
    document_path: { type: String, default: '' }, // file under uploads/bmpl-docs
    user: { type: String, default: '' },
    created_at: { type: String, default: '' },
    updated_at: { type: String, default: '' },
  },
  { strict: false, collection: 'collection_crew_dg_data' }
);

export const CrewDgData = mongoose.models.CrewDgData || mongoose.model('CrewDgData', CrewDgDataSchema);
