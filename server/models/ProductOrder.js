import mongoose from 'mongoose';

// Maps the legacy MySQL-migrated `collection_products_order` collection
// (56 real rows). Like the cart, each document is ONE order line item;
// multiple line items placed together share the same `order_id` (the
// legacy site used a Unix-seconds timestamp as the order id — this app
// keeps that convention for new orders so both eras are consistent).
// No payment fields exist here by design — orders are just a record of
// what was requested, not a transaction.
const ProductOrderSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: Number,

    emailid: { type: String, default: '', index: true },
    indosno: { type: String, default: '' },

    order_id: { type: Number, required: true, index: true },
    product_id: { type: Number, required: true },
    size: { type: String, default: '' },
    quantity: { type: String, default: '1' },

    status: { type: Number, default: 1 },
    cdate: { type: Date, default: Date.now },
  },
  { strict: false, collection: 'collection_products_order' }
);

export const ProductOrder = mongoose.models.ProductOrder || mongoose.model('ProductOrder', ProductOrderSchema);
