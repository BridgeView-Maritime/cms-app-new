import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  first_name: { type: String, required: true, trim: true },
  last_name: { type: String, trim: true, default: null },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobile: { type: String, default: null },
  password: { type: String, required: true },
  profile_photo: { type: String, default: null },
  email_verified: { type: Boolean, default: false },
  mobile_verified: { type: Boolean, default: false },
  two_factor_enabled: { type: Boolean, default: false },
  last_login: { type: Date, default: null },
  failed_login_attempts: { type: Number, default: 0 },
  account_locked: { type: Boolean, default: false },
  status: { type: String, enum: ['Active', 'Inactive', 'Blocked'], default: 'Active' }
}, { timestamps: true });

export default mongoose.model('User', UserSchema);