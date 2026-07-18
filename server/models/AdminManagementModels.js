import mongoose from 'mongoose';

// 1. APP MENUS & SUB-MENUS CONFIGURATION SCHEMA
const AppMenuSchema = new mongoose.Schema({
  menu_name: { type: String, required: true },
  menu_icon: { type: String, default: 'Folder' },
  route: { type: String, default: '' },
  parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AppMenu', default: null },
  sort_order: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

// 2. ROLE MASTER DEFINITIONS
const UserRoleSchema = new mongoose.Schema({
  role_code: { type: String, required: true, unique: true }, // e.g., 'SUPER_ADMIN', 'HR_MANAGER'
  role_name: { type: String, required: true },
  allowed_menus: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AppMenu' }]
}, { timestamps: true });

export const AppMenu = mongoose.models.AppMenu || mongoose.model('AppMenu', AppMenuSchema);
export const UserRole = mongoose.models.UserRole || mongoose.model('UserRole', UserRoleSchema);