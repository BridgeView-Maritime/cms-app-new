import mongoose from 'mongoose';

// Legacy PPE_details1.php. `addppe` is the candidate's own size record per
// product; `ppe_products` is the catalogue with its allowed sizes as a
// comma list; `ppe_request` is the company-side order history.
const AddPpeSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: Number,
    indos: { type: String, default: '', index: true },
    product_name: { type: String, default: '' },
    product_size: { type: String, default: '' },
    emailid: { type: String, default: '', index: true },
    regid: mongoose.Schema.Types.Mixed,
  },
  { strict: false, collection: 'collection_addppe' }
);

const PpeProductSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: Number,
    product: { type: String, default: '' },
    size: { type: String, default: '' },
    status: mongoose.Schema.Types.Mixed,
  },
  { strict: false, collection: 'collection_ppe_products' }
);

const PpeRequestSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: Number,
    indosno: { type: String, default: '', index: true },
    emailid: { type: String, default: '', index: true },
    product: { type: String, default: '' },
    product_size: { type: String, default: '' },
    product_quantity: mongoose.Schema.Types.Mixed,
    product_status: { type: String, default: '' },
    vesselname: { type: String, default: '' },
    company: { type: String, default: '' },
    cdate: mongoose.Schema.Types.Mixed,
    status: mongoose.Schema.Types.Mixed,
  },
  { strict: false, collection: 'collection_ppe_request' }
);

export const AddPpe = mongoose.models.AddPpe || mongoose.model('AddPpe', AddPpeSchema);
export const PpeProduct = mongoose.models.PpeProduct || mongoose.model('PpeProduct', PpeProductSchema);
export const PpeRequest = mongoose.models.PpeRequest || mongoose.model('PpeRequest', PpeRequestSchema);
