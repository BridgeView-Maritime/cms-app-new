import mongoose from 'mongoose';

const LocationHistorySchema = new mongoose.Schema({
  speed: { type: Number, default: 0 },
  course: { type: Number, default: 0 },
  timestamp: { type: Date, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
});

const VesselTrackingSchema = new mongoose.Schema(
  {
    shipId: { type: String, required: true, unique: true }, // External 'id' (e.g., "38469181")
    shipName: { type: String, required: true },
    shipImo: { type: String, required: true, index: true },
    shipMMSI: { type: String, required: true },
    shipType: { type: String },
    country: { type: String },
    flag: { type: String },
    imageUrl: { type: String },
    provider: { type: String },

    // Latest telemetry position data
    currentStatus: {
      hasFreshPosition: { type: Boolean, default: false },
      freshPositionTime: { type: Date },
      freshLocked: { type: Boolean, default: false },
      freshAgeMinutes: { type: Number },
      positionDelayHours: { type: Number },
      accessMode: { type: String },
      lastLat: { type: Number },
      lastLng: { type: Number },
      lastUpdated: { type: Date },
      lastSpeed: { type: Number },
      lastCourse: { type: Number },
    },

    // Array of recorded position coordinates
    history: [LocationHistorySchema],
  },
  { timestamps: true }
);

const VesselTracking = mongoose.model('VesselTracking', VesselTrackingSchema);

export default VesselTracking;