import mongoose from 'mongoose';
import User from '../models/User.js';
import Role from '../models/Role.js';
// Assuming your Menu model looks like your CSS specifications: { name, route, icon, order, permission_key, is_visible, status }
import Menu from '../models/Menu.js'; 
import { hashPassword } from '../utils/bcrypt.js';
import { logAudit } from '../helpers/auditHelper.js';


export const createUser = async (req, res) => {
  const {
    employee_id, role_id, first_name, last_name,
    username, email, mobile, password, two_factor_enabled, status
  } = req.body;

  const creatorId = req.user?.id; 

  // Core Request Parameter Validations
  if (!role_id || !first_name || !username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Validation Error: Missing required user fields."
    });
  }

  try {
    // Identity Conflict Checks (Using case-insensitive checking for username/email)
    const existingUser = await User.findOne({
      $or: [
        { username: username.toLowerCase().trim() },
        { email: email.toLowerCase().trim() }
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Identity Conflict: Username or email already registered."
      });
    }

    // Encrypt security string properties cleanly via bcrypt utility
    const encryptedPassword = await hashPassword(password);

    // Save transactional profile record array parameters directly to database cluster
    const newUser = await User.create({
      employee_id: employee_id || null,
      role_id,
      first_name: first_name.trim(),
      last_name: last_name ? last_name.trim() : null,
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      mobile: mobile || null,
      password: encryptedPassword,
      two_factor_enabled: two_factor_enabled || false,
      status: status || 'Active',
      created_by: creatorId || null
    });

    // Fire audit tracker logging task safely
    try {
      await logAudit(
        creatorId || newUser._id, 
        'User Provisioning', 
        `Created account profile: ID ${newUser._id} (${newUser.username})`, 
        req
      );
    } catch (logErr) {
      console.error('Audit Log Insertion Bypassed:', logErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "User account provisioned successfully.",
      userId: newUser._id
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};


// server/controllers/userController.js

export const getDashboardInitData = async (req, res) => {
  try {
    const userId = req.user?.id; 
    if (!userId) return res.status(400).json({ success: false, message: "Missing User ID Context." });

    const userProfile = await User.findById(userId).populate({
      path: 'role_id',
      select: 'role_name permissions'
    });

    if (!userProfile) return res.status(440).json({ success: false, message: "Session expired." });
    
    const assignedRole = userProfile.role_id;
    const permissionsArray = assignedRole?.permissions || [];

    // --- CRITICAL FIX: SEARCH EVERY REGISTERED MONGOOSE MODEL COLLECTION ---
    let combinedItems = [];
    
    // 1. Pull from the base Menu model
    const baseMenus = await Menu.find({}).lean();
    combinedItems = [...combinedItems, ...baseMenus];

    // 2. Programmatically sweep every other collection active in Mongoose to find the dynamic updates
    const modelNames = mongoose.modelNames();
    for (const modelName of modelNames) {
      if (modelName !== 'User' && modelName !== 'Role' && modelName !== 'Menu') {
        try {
          const extraDocs = await mongoose.model(modelName).find({}).lean();
          // Check if the collection looks like a menu collection (has routes/labels)
          if (extraDocs.length > 0 && (extraDocs[0].route || extraDocs[0].menu_name || extraDocs[0].menu_title)) {
            combinedItems = [...combinedItems, ...extraDocs];
          }
        } catch (err) {
          // Skip non-queryable models safely
        }
      }
    }

    // Deduplicate items cleanly using route/name signatures
    const uniqueMenuMap = new Map();
    combinedItems.forEach(item => {
      // Normalize different schema property names to the front-end standard
      const normalized = {
        ...item,
        _id: item._id ? item._id.toString() : item.id,
        menu_name: item.menu_name || item.menu_title || item.name || item.label,
        route: item.route || item.target_route || item.path,
        parent_id: item.parent_id || null,
        display_order: Number(item.display_order || item.sort_order || item.order || 99)
      };
      
      if (normalized.route) {
        uniqueMenuMap.set(normalized.route, normalized);
      }
    });

    // Super Administrators bypass layout filters completely to ensure everything displays
    const isSuperAdmin = assignedRole?.role_name === 'Super Administrator';
    
    const finalizedMenus = Array.from(uniqueMenuMap.values()).filter(item => {
      // Keep item if active or if it comes from the blueprint designer engine
      const isActive = item.status === 'Active' || item.is_active === true || item.is_active === undefined;
      if (!isActive) return false;
      if (isSuperAdmin) return true;
      
      if (!item.permission_key) return true;
      return permissionsArray.includes(item.permission_key);
    });

    // Sort cleanly by layout positioning weights
    finalizedMenus.sort((a, b) => a.display_order - b.display_order);

    return res.status(200).json({
      success: true,
      user: {
        first_name: userProfile.first_name,
        last_name: userProfile.last_name || '',
        role_name: assignedRole?.role_name || 'Employee',
        email: userProfile.email
      },
      menus: finalizedMenus
    });

  } catch (error) {
    console.error("Dashboard Init Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};