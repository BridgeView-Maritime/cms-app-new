import mongoose from 'mongoose';

const OtpLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  otp_code: { type: String, required: true },
  purpose: { type: String, enum: ['Login', 'ForgotPassword'], required: true },
  expires_at: { type: Date, required: true },
  is_used: { type: Boolean, default: false }
}, { timestamps: true });

// Create compound index matching your historical MySQL performance optimizations
OtpLogSchema.index({ user_id: 1, otp_code: 1, is_used: 1 });

export default mongoose.model('OtpLog', OtpLogSchema);