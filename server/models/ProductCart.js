import mongoose from 'mongoose';

// Maps the legacy MySQL-migrated `collection_products_cart` collection
// (260 real rows). Each document is ONE cart line item, not a nested
// cart-with-items array — a candidate's cart is "every row matching
// their emailid". `product_id` refers to Product.id (a small integer),
// not a Mongo ObjectId. `cart: 1` marks a row as still active/in-cart;
// new rows this app creates just omit `_mysqlId`/legacy `id` entirely.
const ProductCartSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: Number,

    emailid: { type: String, default: '', index: true },
    indosno: { type: String, default: '' },

    product_id: { type: Number, required: true },
    size: { type: String, default: '' },
    quantity: { type: String, default: '1' },

    cart: { type: Number, default: 1 },
    cdate: { type: Date, default: Date.now },
  },
  { strict: false, collection: 'collection_products_cart' }
);

export const ProductCart = mongoose.models.ProductCart || mongoose.model('ProductCart', ProductCartSchema);
