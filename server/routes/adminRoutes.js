import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { AppMenu, UserRole } from '../models/AdminManagementModels.js';
import { FormMeta } from '../models/DynamicMetaSchemas.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();
const User = mongoose.models.User || mongoose.model('User');
const Employee = mongoose.models.Employee || mongoose.model('Employee');



// =========================================================================
// DYNAMIC FORM SCHEMA CREATION & CONFIGURATOR (WITH SUPER_ADMIN PRIVILEGES)
// =========================================================================
router.post('/metadata/form/create', authenticateToken, async (req, res) => {
  try {
    const { form_code, form_name, form_icon, target_layout_mode, app_route_path, menu_id, fields } = req.body;
    
    if (!form_code || !form_name || !fields || fields.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing structural schema configuration details.' });
    }

    const normalizedCode = form_code.trim().toUpperCase();
    
    // Extract potential role descriptors from the token payload
    const rawUserRole = req.user?.role_code || req.user?.role_name || req.user?.role || '';
    // Normalize to handle format mismatch (e.g., "Super Admin" -> "SUPER_ADMIN")
    const currentUserRole = rawUserRole.trim().toUpperCase().replace(/\s+/g, '_');

    const existingSchema = await FormMeta.findOne({ form_code: normalizedCode });

    if (existingSchema) {
      // Evaluate fields accurately by unique field_key to ignore re-ordering or appending additions
      const rolesChanged = fields.some(newField => {
        const oldField = existingSchema.fields.find(f => f.field_key === newField.field_key);
        if (!oldField) return false; // Brand new fields bypass restriction check

        // Normalize arrays through alphabetical sorting to avoid sequence mismatches
        const oldRoles = [...(oldField.allowed_roles || [])].sort();
        const newRoles = [...(newField.allowed_roles || [])].sort();
        
        return JSON.stringify(oldRoles) !== JSON.stringify(newRoles);
      });

      // Matches against normalized "SUPER_ADMIN" safely
      if (rolesChanged && currentUserRole !== 'SUPER_ADMIN') {
        return res.status(403).json({ 
          success: false, 
          message: 'Security Exception: Only a SUPER_ADMIN is permitted to override field role permissions matrices.' 
        });
      }
    }

    // Compute uniform routing target parameters path cleanly
    const fallbackRoute = `/app/workspace/${normalizedCode.toLowerCase().replace(/_/g, '-')}`;
    const cleanRoutePath = app_route_path || fallbackRoute;

    // Update Form Schema Meta Document
    const schemaUpdate = await FormMeta.findOneAndUpdate(
      { form_code: normalizedCode },
      { 
        form_name, 
        form_icon, 
        target_layout_mode: target_layout_mode || 'LISTING_AND_FORM', 
        app_route_path: cleanRoutePath,
        menu_id: menu_id || null, 
        fields 
      },
      { upsert: true, new: true }
    );

    // SYNCHRONIZE BACK TO THE SELECTION TARGET LEAF NODE
    if (menu_id) {
      await AppMenu.findByIdAndUpdate(
        menu_id,
        {
          route: cleanRoutePath,
          menu_icon: form_icon || 'Folder'
        }
      );
    }

    // Dynamic Runtime Database Collections Setup Hook
    const targetCollectionName = `collection_${normalizedCode.toLowerCase()}`;
    if (!mongoose.modelNames().includes(targetCollectionName)) {
      mongoose.model(
        targetCollectionName, 
        new mongoose.Schema({}, { strict: false, timestamps: true }), 
        targetCollectionName
      );
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Successfully saved',
      data: schemaUpdate 
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});


// GET ROUTE: Safely fallback to a clean configuration structure if blueprint is not initialized yet
router.get('/metadata/form/:formCode', authenticateToken, async (req, res) => {
  try {
    const { formCode } = req.params;
    const normalizedCode = formCode.trim().toUpperCase();
    
    const formBlueprint = await FormMeta.findOne({ form_code: normalizedCode });
    
    if (!formBlueprint) {
      return res.status(200).json({
        success: true,
        form_code: normalizedCode,
        form_name: normalizedCode.replace(/_/g, ' '),
        form_icon: 'Briefcase',
        target_layout_mode: 'LISTING_AND_FORM',
        app_route_path: `/app/workspace/${normalizedCode.toLowerCase().replace(/_/g, '-')}`,
        menu_id: null, // Pristine blueprint defaults to unlinked
        fields: []
      });
    }
    
    return res.json(formBlueprint);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 1. MENUS & SUBMENUS REGISTRATION & LISTING
// =========================================================================
router.get('/menus', authenticateToken, async (req, res) => {
  try {
    const menus = await AppMenu.find().sort({ sort_order: 1 });
    res.json({ success: true, data: menus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/menus/create', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const { menu_name, menu_icon, route, parent_id, sort_order } = req.body;
    if (!menu_name) return res.status(400).json({ success: false, message: 'Menu name is required.' });
    
    const newMenu = await AppMenu.create({
      menu_name,
      menu_icon: menu_icon || 'Folder',
      route: route || '',
      parent_id: parent_id || null,
      sort_order: sort_order || 0
    });
    res.status(201).json({ success: true, data: newMenu });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 2. ROLES CREATION & PERMISSION MAPPING
// =========================================================================
router.get('/roles', authenticateToken, async (req, res) => {
  try {
    const roles = await UserRole.find().populate('allowed_menus');
    res.json({ success: true, data: roles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/roles/create', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const { role_code, role_name, allowed_menus } = req.body;
    if (!role_code || !role_name) return res.status(400).json({ success: false, message: 'Missing fields.' });

    const role = await UserRole.findOneAndUpdate(
      { role_code: role_code.toUpperCase() },
      { role_name, allowed_menus },
      { upsert: true, new: true }
    );
    res.status(201).json({ success: true, data: role });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// 3. USER PROVISIONS
// =========================================================================
router.post('/users/create', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    let { username, email, password, role_name, role_id, employee_id } = req.body;

    // Resolve role_id to role_name dynamically if needed
    if (role_id && !role_name && mongoose.Types.ObjectId.isValid(role_id)) {
      const resolvedRoleDoc = await UserRole.findById(role_id);
      if (resolvedRoleDoc) {
        role_name = resolvedRoleDoc.role_name;
      }
    }

    const errors = {};
    if (!username || username.length < 4) errors.username = 'Username must be at least 4 characters.';
    if (!email || !email.includes('@')) errors.email = 'Provide a valid corporate email.';
    if (!role_name) errors.role_name = 'An explicit role must be selected.';
    if (!employee_id) errors.general = 'An employee identity reference must be anchored.';

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ success: false, errors });
    }

    const targetEmployee = await Employee.findById(employee_id);
    if (!targetEmployee) return res.status(404).json({ success: false, message: 'Employee file target not found.' });

    const firstName = targetEmployee.dynamic_data?.first_name || targetEmployee.first_name || 'Staff';
    const lastName = targetEmployee.dynamic_data?.last_name || targetEmployee.last_name || 'Member';

    // Look for an existing user record matching either the username or email
    let user = await User.findOne({ $or: [{ username }, { email }] });
    let isNewUser = false;

    if (user) {
      // FIX / EVOLUTION: Instead of failing, update the existing user to associate with this employee profile
      user.first_name = firstName;
      user.last_name = lastName;
      user.role_name = role_name;
      user.is_active = true;
      
      if (password && password.trim().length >= 6) {
        user.password = await bcrypt.hash(password, 10);
      }
      
      await user.save();
    } else {
      // If it is completely fresh data, run standard generation
      if (!password || password.length < 6) {
        return res.status(422).json({ success: false, errors: { password: 'Password requires minimum 6 characters for new accounts.' } });
      }

      isNewUser = true;
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await User.create({
        username,
        email,
        password: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        role_name,
        is_active: true
      });
    }

    // Bind user ID reference firmly back to the employee object structure
    targetEmployee.user_id = user._id;
    await targetEmployee.save();

    res.status(isNewUser ? 201 : 200).json({ 
      success: true, 
      message: isNewUser ? 'User created successfully' : 'Existing user credentials matched and profile synchronized.',
      userId: user._id 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// FETCH ALL USER CONTEXTS (WITH DYNAMIC ROLE RESOLUTION)
// =========================================================================
router.get('/users/list', authenticateToken, async (req, res) => {
  try {
    // 1. Find all users excluding password hashes
    // 2. Populate 'role_id' pulling only 'role_name' and 'role_code' properties from the Role collection
    const users = await User.find({}, '-password')
      .populate('role_id', 'role_name role_code')
      .lean(); // .lean() converts documents to plain JSON for manual data mutations if required

    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/employees/unlinked', authenticateToken, async (req, res) => {
  try {
    const unlinkedEmployees = await Employee.find({ user_id: { $exists: false } });
    res.json({ success: true, data: unlinkedEmployees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// FETCH ALL CODES FOR DROPDOWNS & LIVE SCHEMA SELECTION
// =========================================================================
router.get('/metadata/forms/list-all', authenticateToken, async (req, res) => {
  try {
    // Selects only the identifying properties needed for selection lists
    const activeBlueprints = await FormMeta.find(
      { is_active: true }, 
      'form_code form_name form_icon target_layout_mode app_route_path'
    );
    
    return res.status(200).json({ 
      success: true, 
      data: activeBlueprints 
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// PURGE / DELETE AN UNWANTED OR DUPLICATE ROUTE CONTEXT CONFIGURATION
// =========================================================================
router.delete('/metadata/form/purge/:formCode', authenticateToken, async (req, res) => {
  try {
    const { formCode } = req.params;
    const normalizedCode = formCode.trim().toUpperCase();

    // 1. Fetch form metadata to find its registered app path before deletion
    const targetMeta = await FormMeta.findOne({ form_code: normalizedCode });
    if (!targetMeta) {
      return res.status(404).json({ success: false, message: 'Form Schema metadata configuration target not found.' });
    }

    // 2. Drop the matching AppMenu layout navigation bar routing node record entry
    await AppMenu.deleteOne({ route: targetMeta.app_route_path });

    // 3. Remove the form schema configuration definition block completely
    await FormMeta.deleteOne({ form_code: normalizedCode });

    return res.status(200).json({ 
      success: true, 
      message: `Form schema structure [${normalizedCode}] and navigation nodes successfully purged.` 
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =========================================================================
// RUNTIME LOOKUP OPTIONS RESOLVER PIPELINE ENGINE
// =========================================================================
router.get('/metadata/lookup/:formCode/:fieldKey', authenticateToken, async (req, res) => {
  try {
    const { formCode, fieldKey } = req.params;
    const targetCollectionName = `collection_${formCode.trim().toLowerCase()}`;
    const cleanFieldKey = fieldKey.trim().toLowerCase();

    // Dynamically access or spin up an isolated schema instance lookup model mapping
    let TargetModel;
    if (mongoose.models[targetCollectionName]) {
      TargetModel = mongoose.models[targetCollectionName];
    } else {
      TargetModel = mongoose.model(
        targetCollectionName,
        new mongoose.Schema({}, { strict: false }),
        targetCollectionName
      );
    }

    // Query for all unique non-empty string properties populated inside the collection database container
    const records = await TargetModel.find({}).select(cleanFieldKey).lean();
    
    const extractionArray = records
      .map(doc => doc[cleanFieldKey])
      .filter(val => val !== undefined && val !== null && val !== '');

    // De-duplicate options using a Set
    const finalizedOptionsList = [...new Set(extractionArray)];

    return res.status(200).json({ 
      success: true, 
      options: finalizedOptionsList 
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Lookup resolver error: ${err.message}` });
  }
});


// =========================================================================
// MISSING UPDATES & SOFT-DELETE STATUS TOGGLES
// =========================================================================

// Update Menu Structure / Toggle Active Status
router.put('/menus/update/:id', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { menu_name, menu_icon, route, parent_id, sort_order, is_active } = req.body;

    // Convert potential string "false"/"true" values safely to native booleans
    let parsedActive;
    if (is_active !== undefined) {
      parsedActive = String(is_active) === 'true';
    }

    const updatedMenu = await AppMenu.findByIdAndUpdate(
      id,
      {
        ...(menu_name !== undefined && { menu_name }),
        ...(menu_icon !== undefined && { menu_icon }),
        ...(route !== undefined && { route }),
        ...(parent_id !== undefined && { parent_id: parent_id || null }),
        ...(sort_order !== undefined && { sort_order: sort_order || 0 }),
        ...(parsedActive !== undefined && { is_active: parsedActive }) // Set explicit boolean flag
      },
      { new: true, runValidators: true }
    );

    if (!updatedMenu) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' });
    }

    res.status(200).json({ success: true, data: updatedMenu });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update Role Structure / Toggle Active Status
router.put('/roles/update/:id', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role_name, allowed_menus, is_active } = req.body;

    // Build the dynamic update payload mapping
    const updatePayload = {};
    if (role_name !== undefined) updatePayload.role_name = role_name;
    if (allowed_menus !== undefined) updatePayload.allowed_menus = allowed_menus;

    // Map incoming boolean "is_active" to schema's string-based "status"
    if (is_active !== undefined) {
      // Handles both literal booleans and incoming stringified fields securely
      const isActiveFlag = String(is_active) === 'true';
      updatePayload.status = isActiveFlag ? 'Active' : 'Inactive';
    }

    const updatedRole = await UserRole.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!updatedRole) {
      return res.status(404).json({ success: false, message: 'Role profile not found.' });
    }

    res.status(200).json({ success: true, data: updatedRole });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update User Metadata / Toggle Active Status
router.put('/users/update/:id', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password, role_name, is_active } = req.body;

    const updatePayload = {};
    if (username !== undefined) updatePayload.username = username;
    if (email !== undefined) updatePayload.email = email;
    if (role_name !== undefined) updatePayload.role_name = role_name;
    if (is_active !== undefined) updatePayload.is_active = is_active;
    
    if (password && password.trim().length >= 6) {
      updatePayload.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    res.status(200).json({ success: true, data: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;