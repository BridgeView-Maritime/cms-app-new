import Employee from '../models/Employee.js';
import AuditLog from '../models/AuditLog.js';

/**
 * 1. REGISTER EMPLOYEE (Atomic MongoDB Document Insertion)
 */
export const registerEmployee = async (req, res) => {
  try {
    const {
      employee_code, first_name, middle_name, last_name, date_of_birth, gender, marital_status, date_of_joining,
      company_name, branch_name, department_name, designation_name,
      address_details, contact_details, salary_details, asset_details, bank_accounts, certificates,
      contracts, documents, education, emergency_contacts, experience, family_details, languages, skills, notes
    } = req.body;

    const creatorId = req.user?.id || null;
    const clientIp = req.ip || '::1';
    const userAgent = req.get('User-Agent') || 'Unknown';

    // Validation: Check for existing employee code
    const duplicate = await Employee.findOne({ employee_code: employee_code.trim() });
    if (duplicate) {
      return res.status(409).json({ 
        success: false, 
        message: "Code index collision observed. Employee code already exists." 
      });
    }

    // Map relational arrays into the nested MongoDB sub-document schema properties
    const newEmployee = new Employee({
      employee_code: employee_code.trim(),
      first_name,
      middle_name,
      last_name,
      date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
      gender,
      marital_status: marital_status || 'Single',
      date_of_joining: date_of_joining ? new Date(date_of_joining) : null,
      company_name: company_name || 'Bridgeview Maritime Corporate Group',
      branch_name,
      department_name,
      designation_name,
      status: 'Active',
      created_by: creatorId,

      // Embedding fields directly into arrays/objects
      addresses: address_details || [],
      contacts: contact_details || [],
      salary_structure: salary_details ? {
        basic_salary: salary_details.basic_salary,
        hra: salary_details.hra || 0,
        allowances: salary_details.allowances || 0,
        deductions: salary_details.deductions || 0,
        effective_date: date_of_joining ? new Date(date_of_joining) : new Date()
      } : undefined,
      allocated_assets: asset_details || [],
      bank_accounts: bank_accounts || [],
      certificates: certificates || [],
      contracts: contracts || [],
      uploaded_documents: documents || [],
      academic_records: education || [],
      emergency_contacts: emergency_contacts || [],
      past_experience: experience || [],
      family_dependents: family_details || [],
      linguistic_proficiencies: languages || [],
      skills: skills || [],
      administrative_notes: notes ? notes.map(n => ({ ...n, added_by: creatorId })) : []
    });

    await newEmployee.save();

    // Log tracking metric data inside the AuditLog collection
    await AuditLog.create({
      user_id: creatorId,
      action: 'Employee Profile Provisioned',
      details: `Created structural directories tracking metrics map for ID ${newEmployee._id}`,
      ip_address: clientIp,
      user_agent: userAgent
    });

    return res.status(201).json({ 
      success: true, 
      message: "Profile saved successfully.", 
      employeeId: newEmployee._id 
    });

  } catch (error) {
    console.error(`Error context in registerEmployee: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 2. UPDATE EMPLOYEE DATA (Direct Document Synchronization)
 */
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name, middle_name, last_name, date_of_birth, gender, marital_status, date_of_joining,
      company_name, branch_name, department_name, designation_name,
      address_details, contact_details, salary_details, bank_accounts, skills, languages
    } = req.body;

    const modifierId = req.user?.id || null;
    const clientIp = req.ip || '::1';
    const userAgent = req.get('User-Agent') || 'Unknown';

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Target core dataset element unmatched." });
    }

    // Overwrite fields and array variables natively
    employee.first_name = first_name;
    employee.middle_name = middle_name || null;
    employee.last_name = last_name;
    if (date_of_birth) employee.date_of_birth = new Date(date_of_birth);
    if (gender) employee.gender = gender;
    if (marital_status) employee.marital_status = marital_status;
    if (date_of_joining) employee.date_of_joining = new Date(date_of_joining);
    if (company_name) employee.company_name = company_name;
    if (branch_name) employee.branch_name = branch_name;
    if (department_name) employee.department_name = department_name;
    if (designation_name) employee.designation_name = designation_name;

    if (address_details) employee.addresses = address_details;
    if (contact_details) employee.contacts = contact_details;
    if (bank_accounts) employee.bank_accounts = bank_accounts;
    if (skills) employee.skills = skills;
    if (languages) employee.linguistic_proficiencies = languages;

    // Conditionally apply update checks for salary variables to record increments
    if (salary_details) {
      const currentSal = employee.salary_structure;
      const shouldUpdateSalary = !currentSal ||
        Number(currentSal.basic_salary) !== Number(salary_details.basic_salary) ||
        Number(currentSal.hra) !== Number(salary_details.hra) ||
        Number(currentSal.allowances) !== Number(salary_details.allowances) ||
        Number(currentSal.deductions) !== Number(salary_details.deductions);

      if (shouldUpdateSalary) {
        employee.salary_structure = {
          basic_salary: salary_details.basic_salary,
          hra: salary_details.hra || 0,
          allowances: salary_details.allowances || 0,
          deductions: salary_details.deductions || 0,
          effective_date: new Date()
        };
      }
    }

    await employee.save();

    await AuditLog.create({
      user_id: modifierId,
      action: 'Employee Record Modified',
      details: `Synchronized structural data parameters maps on file directory context for ID ${id}`,
      ip_address: clientIp,
      user_agent: userAgent
    });

    return res.json({ success: true, message: "Save successfully." });

  } catch (error) {
    console.error(`Error context in updateEmployee: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 3. CHANGE EMPLOYEE STATUS (Pushes History into Document Layer Array)
 */
export const changeEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_status, change_reason } = req.body;
    const modifierId = req.user?.id || null;
    const clientIp = req.ip || '::1';
    const userAgent = req.get('User-Agent') || 'Unknown';

    const validStatuses = ['Active', 'Suspended', 'Terminated', 'Resigned', 'Retired'];
    if (!validStatuses.includes(new_status)) {
      return res.status(400).json({ success: false, message: "Supplied target status state expression is invalid." });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Target employee identifier trace missing." });
    }

    const previousStatus = employee.status;
    employee.status = new_status;

    // Append history directly inside the parent array wrapper
    if (!employee.lifecycle_status_history) {
      employee.lifecycle_status_history = [];
    }
    employee.lifecycle_status_history.push({
      previous_status: previousStatus,
      new_status: new_status,
      changed_by: modifierId,
      change_reason: change_reason || 'Administrative Status Shift Execution',
      changed_at: new Date()
    });

    await employee.save();

    await AuditLog.create({
      user_id: modifierId,
      action: 'Status State Aligned',
      details: `Shifted directory state target from ${previousStatus} to ${new_status} for row ID: ${id}`,
      ip_address: clientIp,
      user_agent: userAgent
    });

    return res.json({ 
      success: true, 
      message: `System lifecycle engine updated status index configuration state to '${new_status}'.` 
    });

  } catch (error) {
    console.error(`Error context in changeEmployeeStatus: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 4. GET COMPLETE PROFILE (Eager Loads Data via Single Document Find)
 */
export const getEmployeeCompleteProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // In MongoDB, a find query fetches all embedded sub-documents in one read operation
    const employee = await Employee.findById(id).lean({ virtuals: true });

    if (!employee) {
      return res.status(404).json({ success: false, message: "Profile query parameter index value location unmatched." });
    }

    // Destructure properties to return a response structure matching your original API blueprint
    return res.json({
      success: true,
      profile: {
        ...employee,
        id: employee._id // Ensure compatibility with existing front-end components
      },
      addresses: employee.addresses || [],
      contacts: employee.contacts || [],
      compensation_history: employee.salary_structure ? [employee.salary_structure] : [],
      current_compensation: employee.salary_structure || null,
      allocated_assets: employee.allocated_assets || [],
      bank_accounts: employee.bank_accounts || [],
      certificates: employee.certificates || [],
      contracts: employee.contracts || [],
      uploaded_documents: employee.uploaded_documents || [],
      academic_records: employee.academic_records || [],
      emergency_contacts: employee.emergency_contacts || [],
      past_experience: employee.past_experience || [],
      family_dependents: employee.family_dependents || [],
      linguistic_proficiencies: employee.linguistic_proficiencies || [],
      skill_matrix: employee.skills || [],
      administrative_notes: employee.administrative_notes || [],
      profile_photos: employee.profile_photos || [],
      lifecycle_status_history: employee.lifecycle_status_history || []
    });

  } catch (error) {
    console.error(`Error context in getEmployeeCompleteProfile: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 5. GET EMPLOYEES LIST (Projections Query optimization routing)
 */
export const getEmployeesList = async (req, res) => {
  try {
    // Optimized projection query: explicitly pull core tracking elements and contact arrays
    const employees = await Employee.find({}, {
      _id: 1,
      employee_code: 1,
      first_name: 1,
      middle_name: 1,
      last_name: 1,
      company_name: 1,
      branch_name: 1,
      status: 1,
      contacts: 1, // Pull array to resolve details locally
      dynamic_data: 1,
      createdAt: 1
    }).sort({ createdAt: -1 }).lean();

    // Map properties internally to ensure front-end layout structural requirements align smoothly
    const formattedEmployees = employees.map(emp => {
      // 1. Resolve email channel preference 
      // Tries explicit contact items first, then drops back to dynamic attributes
      const emailContact = emp.contacts?.find(c => c.contact_type?.toLowerCase() === 'email' || c.type?.toLowerCase() === 'email');
      const email = emailContact?.contact_value || emailContact?.value || 
                    emp.dynamic_data?.employee_email || emp.dynamic_data?.email || null;

      // 2. Resolve mobile channel preference
      const mobileContact = emp.contacts?.find(c => 
        c.contact_type?.toLowerCase() === 'mobile' || 
        c.contact_type?.toLowerCase() === 'phone' || 
        c.type?.toLowerCase() === 'mobile'
      );
      const mobile = mobileContact?.contact_value || mobileContact?.value || 
                     emp.dynamic_data?.mobile || emp.dynamic_data?.phone || null;

      return {
        id: emp._id,
        employee_code: emp.employee_code,
        first_name: emp.first_name,
        middle_name: emp.middle_name,
        last_name: emp.last_name,
        email: email,
        mobile: mobile,
        is_active: emp.status === 'Active' ? 1 : 0,
        created_at: emp.createdAt,
        role_name: 'Employee' 
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedEmployees.length,
      data: formattedEmployees
    });

  } catch (error) {
    console.error(`Error context in getEmployeesList engine: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Internal runtime server error mapping employee list metrics registry."
    });
  }
};