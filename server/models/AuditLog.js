import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  action: { type: String, required: true },
  details: { type: String, default: null },
  ip_address: { type: String, default: null },
  user_agent: { type: String, default: null },
  created_at: { type: Date, default: Date.now }
}); // Kept small and single-purpose for fast appending

export default mongoose.model('AuditLog', AuditLogSchema);