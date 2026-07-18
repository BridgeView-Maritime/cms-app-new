import mongoose from 'mongoose';

// SUB-SCHEMA SCHEMATICS 
const AddressSchema = new mongoose.Schema({
  address_type: { type: String, enum: ['Current', 'Permanent', 'Office'], required: true },
  address_line1: { type: String, required: true },
  address_line2: { type: String, default: null },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postal_code: { type: String, required: true },
  country: { type: String, required: true }
});

const ContactSchema = new mongoose.Schema({
  contact_type: { type: String, enum: ['Personal_Mobile', 'Work_Mobile', 'Personal_Email', 'Work_Email', 'Landline'], required: true },
  contact_value: { type: String, required: true },
  is_primary: { type: Boolean, default: false }
});

const BankAccountSchema = new mongoose.Schema({
  bank_name: { type: String, required: true },
  account_number: { type: String, required: true },
  ifsc_or_routing_code: { type: String, required: true },
  account_type: { type: String, enum: ['Savings', 'Current'], default: 'Savings' },
  branch_name: { type: String, default: null },
  is_primary: { type: Boolean, default: true }
});

const EducationSchema = new mongoose.Schema({
  degree_title: { type: String, required: true },
  institution_name: { type: String, required: true },
  field_of_study: { type: String, default: null },
  year_of_passing: { type: Number, required: true },
  grade_or_gpa: { type: String, default: null }
});

const ExperienceSchema = new mongoose.Schema({
  company_name: { type: String, required: true },
  job_title: { type: String, required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  ctc_drawn: { type: Number, default: 0.00 },
  reason_for_leaving: { type: String, default: null }
});

const SalarySchema = new mongoose.Schema({
  basic_salary: { type: Number, required: true },
  hra: { type: Number, default: 0.00 },
  allowances: { type: Number, default: 0.00 },
  deductions: { type: Number, default: 0.00 },
  effective_date: { type: Date, required: true }
});

// Virtual dynamic compiler for Net Salary calculation replacing MySQL generated columns
SalarySchema.virtual('net_salary').get(function() {
  return (this.basic_salary + this.hra + this.allowances) - this.deductions;
});

// CORE MASTER ROOT SCHEMA
const EmployeeSchema = new mongoose.Schema({
  employee_code: { type: String, required: true, unique: true, trim: true },
  first_name: { type: String, required: true, trim: true },
  middle_name: { type: String, default: null, trim: true },
  last_name: { type: String, required: true, trim: true },
  date_of_birth: { type: Date, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  marital_status: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed'], default: 'Single' },
  date_of_joining: { type: Date, required: true },
  
  // Organization Details
  company_name: { type: String, required: true, default: 'Bridgeview Maritime Corporate Group' },
  branch_name: { type: String, required: true },
  department_name: { type: String, required: true },
  designation_name: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Suspended', 'Terminated', 'Resigned', 'Retired'], default: 'Active' },

  // Embedded Sub-Document Clusters
  addresses: [AddressSchema],
  contacts: [ContactSchema],
  bank_accounts: [BankAccountSchema],
  education_history: [EducationSchema],
  experience_history: [ExperienceSchema],
  salary_structure: SalarySchema,
  
  // Flat Array Tags
  skills: [{
    skill_name: { type: String },
    competency_level: { type: String, enum: ['Beginner', 'Intermediate', 'Expert'] }
  }],
  
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export default mongoose.model('Employee', EmployeeSchema);