// server/models/AdvisoryZone.js
import mongoose from 'mongoose'; // Fixed: Changed from require() to import

const AdvisoryZoneSchema = new mongoose.Schema({
  source: { type: String, required: true, enum: ['UKMTO', 'JMIC', 'IMO', 'NAVWARN'] },
  referenceNumber: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'HIGH' },
  // GeoJSON MultiPolygon or Polygon framework
  geometry: {
    type: {
      type: String,
      enum: ['Polygon', 'MultiPolygon'],
      required: true
    },
    coordinates: {
      type: Array, // Bounded arrays matching standard GeoJSON specifications
      required: true
    }
  },
  publishedAt: { type: Date, required: true },
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Create a 2dsphere index for secondary native geospatial queries if needed
AdvisoryZoneSchema.index({ geometry: "2dsphere" });

// Fixed: Explicitly declare the model variable before exporting it
const AdvisoryZone = mongoose.model('AdvisoryZone', AdvisoryZoneSchema);

export default AdvisoryZone;