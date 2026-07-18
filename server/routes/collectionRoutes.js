// server/routes/collectionRoutes.js
import express from 'express';
import mongoose from 'mongoose';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Helper to safely resolve or initialize a dynamic schema context model on the fly
 */
const getDynamicModel = (formCode) => {
  const cleanCode = formCode.trim().toLowerCase();
  
  const targetCollectionName = cleanCode.startsWith('collection_') 
    ? cleanCode 
    : `collection_${cleanCode}`;

  if (mongoose.models[targetCollectionName]) {
    return mongoose.models[targetCollectionName];
  }

  return mongoose.model(
    targetCollectionName,
    new mongoose.Schema({}, { strict: false, timestamps: true }),
    targetCollectionName
  );
};

// =========================================================================
// 1. GET ALL RECORDS FOR A DYNAMIC COLLECTION
// =========================================================================
router.get('/:formCode/all', authenticateToken, async (req, res) => {
  try {
    const { formCode } = req.params;
    const DynamicModel = getDynamicModel(formCode);

    const records = await DynamicModel.find({}).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: records
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Read failure: ${err.message}` });
  }
});

// =========================================================================
// 2. FIXED: GET A SINGLE RECORD DOCUMENT BY ID (Missing route causing your crash)
// =========================================================================
router.get('/:formCode/:id', authenticateToken, async (req, res) => {
  try {
    const { formCode, id } = req.params;
    const DynamicModel = getDynamicModel(formCode);

    const record = await DynamicModel.findById(id).lean();

    if (!record) {
      return res.status(404).json({ success: false, message: 'Target document not found.' });
    }

    // Returns structural mapping wrapped inside record object for DynamicFormRenderer expectations
    return res.status(200).json({
      success: true,
      record: record
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Read failure: ${err.message}` });
  }
});

// =========================================================================
// 3. CREATE A NEW RECORD IN A DYNAMIC COLLECTION
// =========================================================================
router.post('/:formCode/create', authenticateToken, async (req, res) => {
  try {
    const { formCode } = req.params;
    const DynamicModel = getDynamicModel(formCode);

    const newRecord = await DynamicModel.create(req.body);

    return res.status(201).json({
      success: true,
      message: 'Record successfully added.',
      data: newRecord
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Write failure: ${err.message}` });
  }
});

// =========================================================================
// 4. FIXED: UPDATE AN EXISTING RECORD IN A DYNAMIC COLLECTION
//    Matches frontend URL scheme pattern directly: /api/collections/:formCode/:id
// =========================================================================
router.put('/:formCode/:id', authenticateToken, async (req, res) => {
  try {
    const { formCode, id } = req.params;
    const DynamicModel = getDynamicModel(formCode);

    const updatedRecord = await DynamicModel.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedRecord) {
      return res.status(404).json({ success: false, message: 'Target database record document not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Record successfully updated.',
      data: updatedRecord
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Update failure: ${err.message}` });
  }
});

// =========================================================================
// 5. PURGE / DELETE A RECORD FROM A DYNAMIC COLLECTION
// =========================================================================
router.delete('/:formCode/delete/:id', authenticateToken, async (req, res) => {
  try {
    const { formCode, id } = req.params;
    const DynamicModel = getDynamicModel(formCode);

    const deletedRecord = await DynamicModel.findByIdAndDelete(id);

    if (!deletedRecord) {
      return res.status(404).json({ success: false, message: 'Target database record document not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Record successfully removed.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Deletion failure: ${err.message}` });
  }
});

export default router;