const mongoose = require('mongoose');

const FormSchemaDef = new mongoose.Schema({
  form_code: { type: String, required: true, unique: true, uppercase: true },
  form_name: { type: String, required: true },
  form_icon: { type: String, default: 'Briefcase' },
  target_layout_mode: { 
    type: String, 
    enum: ['LISTING_AND_FORM', 'FORM_ONLY', 'LISTING_ONLY'], 
    default: 'LISTING_AND_FORM' 
  },
  app_route_path: { type: String, required: true },
  fields: { type: Array, default: [] }
}, { timestamps: true });

// Also map a quick runtime layout helper collection for your dynamic navigation menu feeds
const NavigationMenuDef = new mongoose.Schema({
  form_code: { type: String, required: true, unique: true },
  menu_title: { type: String, required: true },
  app_route_path: { type: String, required: true },
  target_layout_mode: { type: String, required: true },
  icon: { type: String, default: 'Briefcase' }
});

const FormSchema = mongoose.model('FormSchema', FormSchemaDef);
const NavigationMenu = mongoose.model('NavigationMenu', NavigationMenuDef);

module.exports = { FormSchema, NavigationMenu };