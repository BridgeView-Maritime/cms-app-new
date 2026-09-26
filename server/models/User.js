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
  status: { type: String, enum: ['Active', 'Inactive', 'Blocked'], default: 'Active' },
  // Opt-in flag: only users with this set to true receive UKMTO auto-alert
  // notifications (bell + email). Managed from the UKMTO Notification Settings page.
  receivesUkmtoAlerts: { type: Boolean, default: false },
  // When true, this user bypasses the mandatory daily attendance gate after login.
  // Managed from the User Management admin tab.
  skip_attendance: { type: Boolean, default: false },
  // BMPL back-office access (the migrated legacy admin). `pages` holds the
  // legacy page names (e.g. 'manage_vacancy.php') the user may open, derived
  // from cms_usersubmenu at import; `all_access` is the legacy supadmin flag.
  // SUPER_ADMIN users see everything regardless.
  bmpl: {
    legacy_id: { type: Number, default: null },
    legacy_username: { type: String, default: null },
    department: { type: String, default: '' },
    all_access: { type: Boolean, default: false },
    pages: { type: [String], default: [] },
  }
}, { timestamps: true });

export default mongoose.model('User', UserSchema);