import mongoose from 'mongoose';

const LoginHistorySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ip_address: { type: String, default: null },
  user_agent: { type: String, default: null },
  status: { type: String, enum: ['Success', 'Failed'], required: true },
  failure_reason: { type: String, default: null },
  attempted_at: { type: Date, default: Date.now }
});

export default mongoose.model('LoginHistory', LoginHistorySchema);