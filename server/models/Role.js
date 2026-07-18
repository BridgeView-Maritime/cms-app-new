import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema({
  role_name: { type: String, required: true },
  role_code: { type: String, required: true, unique: true, uppercase: true },
  description: { type: String, default: null },
  is_system: { type: Boolean, default: false },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  // Store permissions as clean keys strings bound to role arrays
  permissions: [{ type: String }] 
}, { timestamps: true });

export default mongoose.model('Role', RoleSchema);