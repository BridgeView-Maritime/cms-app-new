const { FormSchema, NavigationMenu } = require('../models/FormSchema');
const mongoose = require('mongoose');

exports.createOrUpdateSchemaBlueprint = async (req, res) => {
  try {
    const { form_code, form_name, form_icon, target_layout_mode, app_route_path, fields } = req.body;

    if (!form_code || !form_name) {
      return res.status(400).json({ success: false, message: "Missing required parameters tracking attributes." });
    }

    // Map fields array securely ensuring lookup dependencies pass safely down to payload definitions
    const mappedFields = fields.map(f => ({
      field_key: f.field_key,
      label: f.label,
      input_type: f.input_type,
      section: f.section || 'dynamic_meta',
      options: f.input_type === 'database_lookup' ? [] : f.options,
      lookup_form_code: f.input_type === 'database_lookup' ? f.lookup_form_code : '',
      lookup_field_key: f.input_type === 'database_lookup' ? f.lookup_field_key : '',
      validations: f.validations,
      allowed_roles: f.allowed_roles,
      is_active: f.is_active !== undefined ? f.is_active : true
    }));

    // 1. Atomically Upsert the Form Template Framework Layout definition
    const updatedBlueprint = await FormSchema.findOneAndUpdate(
      { form_code: form_code.toUpperCase() },
      { 
        form_code, 
        form_name, 
        form_icon, 
        target_layout_mode, 
        app_route_path, 
        fields: mappedFields // Use the safely processed fields array
      },
      { upsert: true, new: true }
    );

    // 2. Automatically register this path to dynamic navigation sidebars maps
    await NavigationMenu.findOneAndUpdate(
      { form_code: form_code.toUpperCase() },
      {
        form_code: form_code.toUpperCase(),
        menu_title: form_name,
        app_route_path: app_route_path,
        target_layout_mode: target_layout_mode,
        icon: form_icon
      },
      { upsert: true }
    );

    // 3. Dynamic Runtime Collections Setup Hook
    const targetCollectionName = `collection_${form_code.toLowerCase()}`;
    if (!mongoose.modelNames().includes(targetCollectionName)) {
      mongoose.model(targetCollectionName, new mongoose.Schema({}, { strict: false, timestamps: true }));
    }

    return res.status(200).json({
      success: true,
      message: "Successfully save",
      data: updatedBlueprint
    });
  } catch (error) {
    console.error("Backend compiler failed:", error);
    return res.status(500).json({ success: false, message: `Internal server failure instance: ${error.message}` });
  }
};