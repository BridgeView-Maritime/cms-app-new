import mongoose from 'mongoose';

// Maps the legacy MySQL-migrated `collection_products` collection — the
// merch/PPE catalogue shown on the old site's Products page (6 real
// items: boiler suits, safety gloves/shoes/goggles/helmets, cook
// uniforms). `image` is a filename only (e.g. "ppe.jpg") — the migration
// carried the metadata, not the actual image files.
const ProductSchema = new mongoose.Schema(
  {
    _mysqlId: Number,
    id: { type: Number, index: true },

    title: { type: String, default: '' },
    description: { type: String, default: '' },
    material: { type: String, default: '' },
    price: { type: String, default: '' },

    // "clothing" | "footwear" | "freesize" — governs whether size_chart
    // has real options or the product is one-size-fits-all.
    size: { type: String, default: '' },
    size_chart: { type: String, default: '' },

    image: { type: String, default: '' },
    status: { type: Number, default: 1 },
    cdate: Date,
  },
  { strict: false, collection: 'collection_products' }
);

export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
