// server/models/DynamicMetaSchemas.js
import mongoose from 'mongoose';

// FieldSchema stays exactly the same...
const FieldSchema = new mongoose.Schema({
  field_key: { type: String, required: true },
  label: { type: String, required: true },
  input_type: { 
    type: String, 
    enum: [
      'text', 'textarea', 'email', 'password', 'url',
      'number', 'currency', 'percentage',
      'select', 'multi_select', 'radio', 'checkbox_group', 'boolean_toggle',
      'date', 'datetime', 'time', 'date_range', 'file', 'image'
    ], 
    default: 'text' 
  },
  section: { 
    type: String, 
    enum: ['personal', 'dynamic_meta', 'addresses', 'finance', 'employment', 'education'], 
    default: 'personal' 
  },
  options: [String], 
  lookup_form_code: { type: String, default: '' },
  lookup_field_key: { type: String, default: '' },  
  validations: {
    required: { type: Boolean, default: false },
    min_length: { type: Number, default: 0 },
    max_length: { type: Number, default: 255 },
    min_val: { type: Number },
    max_val: { type: Number },
    regex_pattern: { type: String, default: '' },
    regex_error_msg: { type: String, default: '' },
    max_file_size_mb: { type: Number, default: 5 },
    allowed_file_types: { type: String, default: '.pdf,.png,.jpg' },
    date_restriction: { type: String, enum: ['none', 'past_only', 'future_only'], default: 'none' }
  },
  allowed_roles: [String], 
  is_active: { type: Boolean, default: true } 
});

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
  
  // ================= ADD THIS RELATION LINK TO MENU =================
  menu_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'AppMenu', 
    default: null 
  },
  
  is_active: { type: Boolean, default: true },
  fields: [FieldSchema]
}, { timestamps: true });

export const FormMeta = mongoose.models.FormMeta || mongoose.model('FormMeta', FormMetaSchema);