const { FormSchema, NavigationMenu } = require('../models/FormSchema');
const mongoose = require('mongoose');

exports.createOrUpdateSchemaBlueprint = async (req, res) => {
  try {
    const { form_code, form_name, form_icon, target_layout_mode, app_route_path, fields, has_custom_page } = req.body;

    if (!form_code || !form_name) {
      return res.status(400).json({ success: false, message: "Missing required parameters tracking attributes." });
    }

    // Map fields array securely preserving field IDs and passing layout/disclaimer/toggle/repeater attributes cleanly
    const mappedFields = fields.map(f => {
      const isSameLineBool = f.same_line !== undefined ? Boolean(f.same_line) : (f.is_same_line !== undefined ? Boolean(f.is_same_line) : false);
      const spanVal = String(f.grid_span || f.grid_width_span || '12');

      const fieldDoc = {
        field_key: f.field_key,
        label: f.label,
        input_type: f.input_type,
        section: f.section || 'dynamic_meta',
        options: f.input_type === 'database_lookup' ? [] : f.options,
        lookup_form_code: f.input_type === 'database_lookup' ? f.lookup_form_code : '',
        lookup_field_key: f.input_type === 'database_lookup' ? f.lookup_field_key : '',
        lookup_label_key: f.input_type === 'database_lookup' ? f.lookup_label_key : '',
        
        // REPEATER SUB-FIELDS
        sub_fields: f.input_type === 'repeater' && Array.isArray(f.sub_fields) ? f.sub_fields.map(sf => ({
          field_key: sf.field_key,
          label: sf.label,
          input_type: sf.input_type || 'text',
          options: sf.options || [],
          lookup_form_code: sf.lookup_form_code || '',
          lookup_field_key: sf.lookup_field_key || '',
          lookup_label_key: sf.lookup_label_key || '',
          placeholder: sf.placeholder || '',
          ...(sf._id ? { _id: sf._id } : {})
        })) : [],

        // SAME LINE & GRID LAYOUT CONFIGURATION ATTRIBUTES
        same_line: isSameLineBool,
        is_same_line: isSameLineBool,
        same_line_group: f.same_line_group || '',
        grid_span: spanVal,
        grid_width_span: spanVal,

        // DISCLAIMER CONFIGURATION ATTRIBUTES
        has_disclaimer: f.has_disclaimer !== undefined ? Boolean(f.has_disclaimer) : false,
        disclaimer_text: f.has_disclaimer ? (f.disclaimer_text || '') : '',

        // TOGGLE SWITCH CONFIGURATION ATTRIBUTES
        toggle_format: f.toggle_format || 'boolean',
        default_value: f.default_value !== undefined ? f.default_value : false,

        validations: f.validations,
        allowed_roles: f.allowed_roles,
        is_active: f.is_active !== undefined ? f.is_active : true
      };

      // Retain MongoDB subdocument _id if updating an existing field node
      if (f._id) {
        fieldDoc._id = f._id;
      }

      return fieldDoc;
    });

    // Build update object ensuring has_custom_page defaults to 0 if not provided
    const updatePayload = { 
      form_code: form_code.toUpperCase(), 
      form_name, 
      form_icon, 
      target_layout_mode, 
      app_route_path, 
      fields: mappedFields,
      has_custom_page: has_custom_page !== undefined ? Number(has_custom_page) : 0
    };

    // 1. Atomically Upsert the Form Template Framework Layout definition
    const updatedBlueprint = await FormSchema.findOneAndUpdate(
      { form_code: form_code.toUpperCase() },
      updatePayload,
      { upsert: true, new: true, runValidators: true }
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
      message: "Successfully saved",
      data: updatedBlueprint
    });
  } catch (error) {
    console.error("Backend compiler failed:", error);
    return res.status(500).json({ success: false, message: `Internal server failure instance: ${error.message}` });
  }
};