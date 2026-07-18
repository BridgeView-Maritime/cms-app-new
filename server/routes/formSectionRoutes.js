import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// ==========================================
// Mongoose Models Setup
// ==========================================

// 1. FormMeta Schema (Your form template schema from MongoDB)
const FormMetaSchema = new mongoose.Schema({
  form_code: { type: String, required: true, unique: true },
  form_name: { type: String, required: true },
  form_icon: { type: String, default: 'Briefcase' },
  fields: [
    {
      field_key: { type: String, required: true },
      label: { type: String, required: true },
      section: { type: String, required: true }, // e.g., 'personal', 'employment'
      is_active: { type: Boolean, default: true }
    }
  ],
  is_active: { type: Boolean, default: true }
}, { collection: 'formmetas', timestamps: true });

const FormMeta = mongoose.models.FormMeta || mongoose.model('FormMeta', FormMetaSchema);

// 2. FormSection Schema (Active configured sections instance database collection)
const FormSectionSchema = new mongoose.Schema({
  id: { type: String, required: true },          // e.g. 'personal'
  label: { type: String, required: true },       // e.g. 'Personal Info'
  icon: { type: String, default: 'FileText' },
  is_active: { type: Boolean, default: true },
  form_code: { type: String, required: true }    // e.g. 'EMPLOYEE_MASTER_DIRECTORY'
}, { collection: 'form_sections', timestamps: true });

// Avoid duplicate model definition errors during hot reloads
const FormSection = mongoose.models.FormSection || mongoose.model('FormSection', FormSectionSchema);


// ==========================================
// API Routes Handlers
// ==========================================

// 1. GET: Fetch all sections. Defaults to sections derived from formmetas if form_sections is empty.
router.get('/form-sections', async (req, res) => {
  try {
    const { form_code } = req.query;
    if (!form_code) {
      return res.status(400).json({ success: false, message: 'Missing required query parameter: form_code' });
    }

    const upperFormCode = form_code.toUpperCase();

    // Query active records matching this form_code from the form_sections collection
    const configuredSections = await FormSection.find({ form_code: upperFormCode });

    // Scenario: Custom sections exist in database
    if (configuredSections && configuredSections.length > 0) {
      return res.status(200).json({
        success: true,
        sections: configuredSections
      });
    }

    // Default Fallback Scenario: Values are blank/missing in form_sections. Get them dynamically from formmetas.
    const formMetaTemplate = await FormMeta.findOne({ form_code: upperFormCode });

    if (!formMetaTemplate) {
      return res.status(404).json({ 
        success: false, 
        message: `No configurations found in either form_sections or formmetas for form_code: ${upperFormCode}` 
      });
    }

    // Find all unique, non-empty, active sections linked to the form fields dynamically
    const uniqueSectionKeys = [
      ...new Set(
        formMetaTemplate.fields
          .filter(field => field.is_active && field.section)
          .map(field => field.section.toLowerCase())
      )
    ];

    // Helper formatter to convert keys to user-friendly titles (e.g., 'personal' -> 'Personal')
    const formatLabel = (str) => str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');

    // Generate dynamic configurations dynamically on-the-fly from metadata
    const dynamicSections = uniqueSectionKeys.map(secId => ({
      id: secId,
      label: formatLabel(secId),
      icon: 'FileText', // Neutral default icon
      is_active: true,
      form_code: upperFormCode
    }));

    return res.status(200).json({
      success: true,
      sections: dynamicSections
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. POST: Insert a new section document safely into MongoDB
router.post('/form-sections/create', async (req, res) => {
  try {
    const { form_code, id, label, icon, is_active } = req.body;

    if (!form_code || !id || !label) {
      return res.status(400).json({ success: false, message: 'Missing required payload body items.' });
    }

    const cleanFormCode = form_code.toUpperCase();
    const cleanId = id.toLowerCase();

    // Ensure database-level constraint duplicate checking
    const exists = await FormSection.findOne({ id: cleanId, form_code: cleanFormCode });
    if (exists) {
      return res.status(400).json({ success: false, message: 'A partition with that identifier already exists.' });
    }

    const newSection = new FormSection({
      form_code: cleanFormCode,
      id: cleanId,
      label,
      icon: icon || 'FileText',
      is_active: is_active ?? true
    });

    await newSection.save();

    return res.status(201).json({
      success: true,
      message: 'Document committed to MongoDB successfully',
      section: newSection
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. PUT: Update metadata structural parameters of a section mapping index in MongoDB
router.put('/form-sections/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { form_code, label, icon } = req.body;

    if (!form_code) {
      return res.status(400).json({ success: false, message: 'Missing form_code context validation parameter.' });
    }

    const targetSection = await FormSection.findOne({ id: id.toLowerCase(), form_code: form_code.toUpperCase() });

    if (!targetSection) {
      return res.status(404).json({ success: false, message: 'Target layout configuration segment not found.' });
    }

    // Apply visual property updates
    if (label) targetSection.label = label;
    if (icon) targetSection.icon = icon;

    await targetSection.save();

    return res.status(200).json({
      success: true,
      message: 'Updated configuration properties successfully.',
      section: targetSection
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 4. PATCH: Toggle active status visibility flags
router.patch('/form-sections/toggle/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { form_code, is_active } = req.body;

    if (!form_code || is_active === undefined) {
      return res.status(400).json({ success: false, message: 'Missing form_code or is_active payload parameters.' });
    }

    const section = await FormSection.findOne({ id: id.toLowerCase(), form_code: form_code.toUpperCase() });

    if (!section) {
      return res.status(404).json({ success: false, message: 'Target configuration target not found.' });
    }

    section.is_active = is_active;
    await section.save();

    return res.status(200).json({ success: true, message: 'Visibility matrix updated successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 5. DELETE: Drop structural configuration model node securely from MongoDB database
router.delete('/form-sections/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { form_code } = req.query;

    if (!form_code) {
      return res.status(400).json({ success: false, message: 'Missing scope form_code context validation parameter.' });
    }

    const result = await FormSection.deleteOne({ id: id.toLowerCase(), form_code: form_code.toUpperCase() });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'No records matching target found to drop.' });
    }

    return res.status(200).json({ success: true, message: 'Dropped section schema successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;