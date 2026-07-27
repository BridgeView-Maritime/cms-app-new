import mongoose from 'mongoose';

// Schema for sub-fields inside a repeater input
const SubFieldSchema = new mongoose.Schema({
  field_key: { type: String, required: true },
  label: { type: String, required: true },
  input_type: { 
    type: String, 
    enum: [
      'text', 'textarea', 'email', 'password', 'url',
      'number', 'currency', 'percentage',
      'select', 'database_lookup', 'multi_select', 'radio', 'checkbox_group', 'boolean_toggle',
      'date', 'datetime', 'time', 'date_range', 'file', 'image'
    ], 
    default: 'text' 
  },
  options: { type: mongoose.Schema.Types.Mixed, default: [] },
  lookup_form_code: { type: String, default: '' },
  lookup_field_key: { type: String, default: '' },
  placeholder: { type: String, default: '' }
}, { _id: true });

const FieldSchema = new mongoose.Schema({
  field_key: { type: String, required: true },
  label: { type: String, required: true },
  input_type: { 
    type: String, 
    enum: [
      'text', 'textarea', 'email', 'password', 'url',
      'number', 'currency', 'percentage',
      'select', 'database_lookup', 'multi_select', 'radio', 'checkbox_group', 'boolean_toggle',
      'date', 'datetime', 'time', 'date_range', 'file', 'image',
      'repeater'
    ], 
    default: 'text' 
  },
  section: { 
    type: String, 
    default: 'dynamic_meta' 
  },
  options: { type: mongoose.Schema.Types.Mixed, default: [] }, 
  lookup_form_code: { type: String, default: '' },
  lookup_field_key: { type: String, default: '' },  

  // ================= REPEATER SUB-FIELDS =================
  sub_fields: [SubFieldSchema],

  // ================= SAME LINE & LAYOUT CONFIGURATION =================
  same_line: { 
    type: Boolean, 
    default: false 
  },
  is_same_line: { 
    type: Boolean, 
    default: false 
  },
  same_line_group: { 
    type: String, 
    default: '' 
  },
  grid_span: { 
    type: String, 
    default: '12' 
  },

  // ================= DISCLAIMER CONFIGURATION =================
  has_disclaimer: { 
    type: Boolean, 
    default: false 
  },
  disclaimer_text: { 
    type: String, 
    default: '' 
  },

  // ================= TOGGLE SWITCH CONFIGURATION =================
  toggle_format: { 
    type: String, 
    enum: ['boolean', 'active_inactive', 'yes_no', 'numeric'], 
    default: 'boolean' 
  },
  default_value: { 
    type: mongoose.Schema.Types.Mixed, 
    default: false 
  },

  validations: {
    required: { type: Boolean, default: false },
    min_length: { type: Number, default: 0 },
    max_length: { type: Number, default: 255 },
    min_val: { type: Number, default: null },
    max_val: { type: Number, default: null },
    regex_pattern: { type: String, default: '' },
    regex_error_msg: { type: String, default: '' },
    max_file_size_mb: { type: Number, default: 5 },
    allowed_file_types: { type: String, default: '.pdf,.png,.jpg' },
    date_restriction: { type: String, enum: ['none', 'past_only', 'future_only'], default: 'none' }
  },
  allowed_roles: [String], 
  is_active: { type: Boolean, default: true } 
}, { _id: true });

const FormMetaSchema = new mongoose.Schema({
  form_code: { type: String, required: true, unique: true, uppercase: true },
  form_name: { type: String, required: true },
  form_icon: { type: String, default: 'Settings' }, 
  target_layout_mode: { 
    type: String, 
    enum: ['LISTING_AND_FORM', 'FORM_ONLY', 'LISTING_ONLY'], 
    default: 'LISTING_AND_FORM' 
  },
  app_route_path: { type: String, required: true },
  
  // ================= CUSTOM PAGE FLAG =================
  has_custom_page: { type: Number, default: 0 },

  // ================= RELATION LINK TO MENU =================
  menu_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'AppMenu', 
    default: null 
  },
  
  is_active: { type: Boolean, default: true },
  fields: [FieldSchema]
}, { timestamps: true, strict: false });

export const FormMeta = mongoose.models.FormMeta || mongoose.model('FormMeta', FormMetaSchema);