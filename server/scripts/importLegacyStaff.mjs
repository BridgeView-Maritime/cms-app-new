// Imports the legacy admin logins (bridgeoffic.companylogin) as app users.
//
//   node scripts/importLegacyStaff.mjs            # import / refresh
//   node scripts/importLegacyStaff.mjs --dry-run
//
// - Legacy passwords are plain text, so they are bcrypt-hashed here and the
//   staff keep signing in with the password they already know.
// - Legacy status 1 -> Active, anything else -> Inactive (176 of 186 rows).
// - Menu rights come from cms_usersubmenu joined to cms_submenu: the set of
//   legacy page names the user may open. Names in `supadmin` get all_access.
// - Role: names in supadmin become SUPER_ADMIN; everyone else EMPLOYEE.
// - Idempotent: matches existing users by username or email and only fills
//   in the bmpl block (never touches an existing password, role or status).
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Role from '../models/Role.js';

dotenv.config({ quiet: true });
const dryRun = process.argv.includes('--dry-run');

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
const db = mongoose.connection.db;

const [staff, supadmin, userMenus, userSubmenus, submenus] = await Promise.all([
  db.collection('collection_companylogin').find({}).toArray(),
  db.collection('collection_supadmin').find({}).toArray(),
  db.collection('collection_cms_usermenu').find({ status: { $in: ['1', 1] } }).toArray(),
  db.collection('collection_cms_usersubmenu').find({ status: { $in: ['1', 1] } }).toArray(),
  db.collection('collection_cms_submenu').find({}).toArray(),
]);
const superNames = new Set(supadmin.map((s) => String(s.name).toLowerCase()));
const pageOfSubmenu = new Map(submenus.map((s) => [String(s.submenu_id), String(s.page_name || '').split('?')[0]]));
const pagesByUser = new Map();
for (const r of userSubmenus) {
  const u = String(r.user || '').toLowerCase();
  const p = pageOfSubmenu.get(String(r.submenu_id));
  if (!u || !p) continue;
  if (!pagesByUser.has(u)) pagesByUser.set(u, new Set());
  pagesByUser.get(u).add(p);
}

const roles = await Role.find({}).lean();
const superRole = roles.find((r) => r.role_code === 'SUPER_ADMIN');
const employeeRole = roles.find((r) => r.role_code === 'EMPLOYEE');
if (!superRole || !employeeRole) { console.error('roles SUPER_ADMIN / EMPLOYEE must exist'); process.exit(1); }

const summary = { created: 0, linked: 0, skipped: 0 };
for (const s of staff) {
  const username = String(s.username || '').trim().toLowerCase();
  if (!username) { summary.skipped++; continue; }
  const email = String(s.email || s.per_email || '').trim().toLowerCase() || (username + '@bridgeviewmaritime.local');
  const isSuper = superNames.has(username);
  const bmpl = {
    legacy_id: Number(s.id) || null,
    legacy_username: username,
    department: String(s.dept || '').trim(),
    all_access: isSuper,
    pages: [...(pagesByUser.get(username) || [])].sort(),
  };

  const existing = await User.findOne({ $or: [{ username }, { email }] });
  if (existing) {
    if (!dryRun) { existing.bmpl = bmpl; await existing.save(); }
    summary.linked++;
    continue;
  }

  const [first, ...rest] = String(s.fullname || username).trim().split(/\s+/);
  const plain = String(s.password || '');
  const doc = {
    role_id: isSuper ? superRole._id : employeeRole._id,
    first_name: first || username,
    last_name: rest.join(' ') || null,
    username,
    email,
    mobile: s.phonenumber ? String(s.phonenumber) : null,
    password: await bcrypt.hash(plain || Math.random().toString(36).slice(2) + Date.now(), 10),
    email_verified: true,
    status: String(s.status) === '1' ? 'Active' : 'Inactive',
    skip_attendance: true,
    bmpl,
  };
  if (!dryRun) await User.create(doc);
  summary.created++;
}

console.log((dryRun ? '[dry run] ' : '') + 'created ' + summary.created + ', linked to existing ' + summary.linked + ', skipped ' + summary.skipped);
const active = await User.countDocuments({ 'bmpl.legacy_id': { $ne: null }, status: 'Active' });
console.log('BMPL-enabled users: ' + await User.countDocuments({ 'bmpl.legacy_id': { $ne: null } }) + ' (' + active + ' active), all_access: ' + await User.countDocuments({ 'bmpl.all_access': true }));
await mongoose.disconnect();
