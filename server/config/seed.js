import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Menu from '../models/Menu.js'; // Added missing Menu model mapping

// Load system environment configurations
dotenv.config();

// Define clean, modular Permissions and Menus structures 
const SYSTEM_PERMISSIONS = [
  // User Management Permissions
  'user:create', 'user:read', 'user:update', 'user:delete',
  // Employee Directory Permissions
  'employee:create', 'employee:read', 'employee:update', 'employee:delete', 'employee:status',
  // Metadata Configuration Control
  'metadata:write', 'metadata:read',
  // Audit Metrics Clearance
  'audit:read'
];

const SYSTEM_MENUS = [
  { id: 1, parent_id: null, menu_name: 'Dashboard', route: '/dashboard', menu_icon: 'LayoutDashboard', display_order: 1, permission_key: 'user:read', is_visible: true, status: 'Active' },
//   { id: 2, parent_id: null, menu_name: 'Employee Directory', route: '/employees', menu_icon: 'Users', display_order: 2, permission_key: 'employee:read', is_visible: true, status: 'Active' },
  { id: 2, parent_id: null, menu_name: 'User Control', route: '/users', menu_icon: 'ShieldCheck', display_order: 2, permission_key: 'user:create', is_visible: true, status: 'Active' },
  { id: 3, parent_id: null, menu_name: 'Metadata Config', route: '/metadata', menu_icon: 'Settings', display_order: 3, permission_key: 'metadata:read', is_visible: true, status: 'Active' },
  { id: 4, parent_id: null, menu_name: 'Audit Logs', route: '/audit', menu_icon: 'History', display_order: 4, permission_key: 'audit:read', is_visible: true, status: 'Active' }
];

const seedDatabase = async () => {
  try {
    // 1. Establish connection to MongoDB instance
    const dbUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cms_new_db';
    await mongoose.connect(dbUri);
    console.log('🔌 Connected to MongoDB deployment safely for data initialization.');

    // 2. Synchronize Systemic UI Menus
    console.log('🗂️  Syncing dashboard core menus components...');
    for (const menuData of SYSTEM_MENUS) {
      await Menu.findOneAndUpdate(
        { id: menuData.id },
        menuData,
        { upsert: true, new: true }
      );
    }
    console.log('✅ Base menu layout matrices synced successfully.');

    // 3. Provision and Register Super Admin System Role
    console.log('⚙️  Syncing core administrative roles and structural policy permissions...');
    let adminRole = await Role.findOne({ role_code: 'SUPER_ADMIN' });
    
    if (!adminRole) {
      adminRole = await Role.create({
        role_name: 'Super Administrator',
        role_code: 'SUPER_ADMIN',
        description: 'Master administrative context authority with complete operational clearance.',
        is_system: true,
        status: 'Active',
        permissions: SYSTEM_PERMISSIONS // Grants ALL system access keys
      });
      console.log('✅ Created Super Administrator primary role metadata matrix.');
    } else {
      // Keep permissions up to date
      adminRole.permissions = SYSTEM_PERMISSIONS;
      await adminRole.save();
      console.log('🔄 Updated existing Super Administrator security permissions array.');
    }

    // 4. Provision and Register a Standard Employee/User Role for fallback
    let staffRole = await Role.findOne({ role_code: 'EMPLOYEE' });
    if (!staffRole) {
      await Role.create({
        role_name: 'Standard Employee',
        role_code: 'EMPLOYEE',
        description: 'Default staff profile mapping permissions.',
        is_system: false,
        status: 'Active',
        permissions: ['employee:read'] // Restricted read-only permissions baseline
      });
      console.log('✅ Created fallback baseline Employee role record.');
    }

    // 5. Provision and Secure the Default Super Admin Login Credentials
    console.log('🔒 Provisioning Master Administrator profile footprint...');
    const defaultAdminEmail = 'itsupport@bridgeviewmaritime.com';
    const existingAdminUser = await User.findOne({ email: defaultAdminEmail });

    if (!existingAdminUser) {
      const salt = await bcrypt.genSalt(10);
      // Hardening password match matrix for runtime validation
      const securePasswordHashed = await bcrypt.hash('Admin@Bridgeview2026', salt);

      const superUser = await User.create({
        role_id: adminRole._id,
        first_name: 'Bridgeview',
        last_name: 'Super Admin',
        username: 'superadmin',
        email: defaultAdminEmail,
        mobile: '+1234567890',
        password: securePasswordHashed,
        email_verified: true,
        mobile_verified: true,
        two_factor_enabled: false,
        status: 'Active'
      });

      console.log('🚀 Root Super Admin record initialized successfully!');
      console.log('====================================================');
      console.log(`📧 Login Username: superadmin`);
      console.log(`📧 Login Email:    ${superUser.email}`);
      console.log(`🔑 Default Password: Admin@Bridgeview2026`);
      console.log('====================================================');
    } else {
      console.log('ℹ️  Master user registry profile found. Seeding operations bypassed for security integrity.');
    }

    // Close process pipeline clean
    await mongoose.connection.close();
    console.log('🏁 Database seeding sequence complete. Pipeline socket detached safely.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal exception processed during deployment seeding routine:', error.message);
    process.exit(1);
  }
};

// Fire processing execution flow
seedDatabase();