// server/routes/employeeRoutes.js
import express from 'express';
import { 
  registerEmployee, 
  updateEmployee, 
  changeEmployeeStatus, 
  getEmployeeCompleteProfile,
  getEmployeesList 
} from '../controllers/employeeController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

// Explicitly import your models to avoid mongoose lookup issues
import Employee from '../models/Employee.js';

// Dynamic Meta Schema & Role Imports
import { FormMeta } from '../models/DynamicMetaSchemas.js';
import Role from '../models/Role.js'; // Imported to fetch the required role_id dynamically
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const router = express.Router();

// Fallback lookup models for credentials matching user operations schema bounds
const User = mongoose.models.User || mongoose.model('User');

// ==========================================
// EXISTING CODE ENVELOPE ROUTE ROUTINES
// ==========================================
router.get('/list', authenticateToken, getEmployeesList);
router.post('/register', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'HR'), registerEmployee);

// FIXED: Added flattening middleware layer to capture wrapped fields from dynamic structures
router.put(
  '/update/:id', 
  authenticateToken, 
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'HR'), 
  (req, res, next) => {
    // Detect nested dynamic payloads from modern form states
    const sourceData = req.body.dynamic_fields_payload || req.body.dynamic_data || req.body.profile;
    
    if (sourceData && typeof sourceData === 'object') {
      // Safely promote deeply nested attributes up to the root body layer for validation mapping
      const priorityKeys = [
        'first_name', 'middle_name', 'last_name', 'date_of_birth', 
        'gender', 'date_of_joining', 'branch_name', 'department_name', 
        'designation_name', 'company_name', 'status'
      ];

      priorityKeys.forEach(key => {
        if (sourceData[key] !== undefined && req.body[key] === undefined) {
          req.body[key] = sourceData[key];
        }
      });
      
      // Keep dynamic data blocks accessible to the model configuration if needed
      if (!req.body.dynamic_data) {
        req.body.dynamic_data = sourceData;
      }
    }
    next();
  }, 
  updateEmployee
);

// Enhanced Status change handler logic routing
router.patch('/status/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'HR'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { new_status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid MongoDB ID format provided.' });
    }

    // Direct inline update of Employee collection to ensure structural modification works
    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      { status: new_status },
      { new: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ success: false, message: 'Employee file matching target ID not found.' });
    }

    // If there is an associated User container, toggle its access state based on status
    if (updatedEmployee.user_id) {
      await User.findByIdAndUpdate(updatedEmployee.user_id, {
        is_active: new_status === 'Active'
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: `Employee lifecycle altered to ${new_status} successfully.`,
      data: updatedEmployee 
    });
  } catch (err) {
    // If inline logic experiences issues, fall back onto controller wrapper logic
    next(err);
  }
}, changeEmployeeStatus);

router.get('/profile/:id', authenticateToken, getEmployeeCompleteProfile);

// ==========================================
// NEW: HRMS DYNAMIC METADATA PLATFORM ENHANCEMENTS
// ==========================================

// Fetch Form Schema Blueprint Engine
router.get('/meta/form/:formCode', authenticateToken, async (req, res) => {
  try {
    const layout = await FormMeta.findOne({ form_code: req.params.formCode });
    res.json(layout || { fields: [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update or Inject field variables dynamically (Restricted to Super Admin)
router.post('/meta/form/:formCode/fields', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const { fields } = req.body;
    const updated = await FormMeta.findOneAndUpdate(
      { form_code: req.params.formCode },
      { fields },
      { new: true, upsert: true }
    );
    res.json({ success: true, updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Submit Hybrid Joining Records with Auto-Generated Credentials
router.post('/register-dynamic', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'HR'), async (req, res) => {
  const { 
    employee_code, 
    system_credentials, 
    dynamic_fields_payload, 
    form_code,
    employee_email,
    employee_role 
  } = req.body;

  try {
    const formMeta = await FormMeta.findOne({ form_code });
    if (!formMeta) return res.status(400).json({ success: false, message: 'Metadata schema reference missing.' });

    // Validate payloads at runtime against dynamic configuration
    const validationsErrors = {};
    formMeta.fields.forEach(field => {
      const val = dynamic_fields_payload[field.field_key];
      if (field.validations?.required && (!val || val === '')) {
        validationsErrors[field.field_key] = `${field.label} is marked required.`;
      }
    });

    if (Object.keys(validationsErrors).length > 0) {
      return res.status(422).json({ success: false, errors: validationsErrors });
    }

    // Verify code index collision
    const duplicate = await Employee.findOne({ employee_code: employee_code.trim() });
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'Employee code already exists.' });
    }

    // Extract core identity parameters safely from your dynamic field maps
    const fName = dynamic_fields_payload.first_name || 'Staff';
    const mName = dynamic_fields_payload.middle_name || null;
    const lName = dynamic_fields_payload.last_name || 'Member';
    const dob = dynamic_fields_payload.date_of_birth ? new Date(dynamic_fields_payload.date_of_birth) : new Date('1995-01-01');
    const gender = dynamic_fields_payload.gender || 'Other';
    const doj = dynamic_fields_payload.date_of_joining ? new Date(dynamic_fields_payload.date_of_joining) : new Date();

    // Org structures
    const branch = dynamic_fields_payload.branch_name || 'Main HQ';
    const dept = dynamic_fields_payload.department_name || 'Operations';
    const desig = dynamic_fields_payload.designation_name || 'Operator';

    // Establish correct email and role mappings
    const targetEmail = employee_email || dynamic_fields_payload.employee_email || dynamic_fields_payload.emp_email || system_credentials?.email;

    if (!targetEmail) {
      return res.status(400).json({ success: false, message: "Email is required to create a user account." });
    }

    const targetRoleName = employee_role || 'EMPLOYEE';
    const roleDoc = await Role.findOne({ 
      $or: [
        { role_code: targetRoleName.toUpperCase() }, 
        { role_name: targetRoleName }
      ] 
    });

    if (!roleDoc) {
      return res.status(400).json({ 
        success: false, 
        message: `Database matching reference for Role '${targetRoleName}' was not found. Please initialize this system role first.` 
      });
    }

    // 1. Provision Access Account Node with newly resolved parameters
    const hashedPassword = await bcrypt.hash(system_credentials?.password || 'Welcome@2026', 10);
    const generatedUser = await User.create({
      username: system_credentials?.username || targetEmail.split('@')[0],
      email: targetEmail,
      password: hashedPassword,
      first_name: fName,
      last_name: lName,
      role_id: roleDoc._id,
      role_name: roleDoc.role_name,
      is_active: true
    });

    // 2. Save document with integrated fields
    const employeeDoc = await Employee.create({
      employee_code: employee_code.trim(),
      user_id: generatedUser._id,
      first_name: fName,
      middle_name: mName,
      last_name: lName,
      date_of_birth: dob,
      gender: gender,
      date_of_joining: doj,
      branch_name: branch,
      department_name: dept,
      designation_name: desig,
      company_name: dynamic_fields_payload.company_name || 'Bridgeview Maritime Corporate Group',
      status: 'Active',
      dynamic_data: dynamic_fields_payload
    });

    res.status(201).json({ 
      success: true, 
      message: 'Employee joined and access keys initialized.', 
      employeeId: employeeDoc._id 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;