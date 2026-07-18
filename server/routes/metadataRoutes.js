import express from 'express';
import { createMetadataRecord, updateMetadataRecord, fetchAllMetadataRecords } from '../controllers/metadataController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Dynamic route interface evaluating incoming strings (:table) to process companies/branches/departments/designations
router.get('/:table', authenticateToken, fetchAllMetadataRecords);
router.post('/:table', authenticateToken, authorizeRoles(1, 2), createMetadataRecord);
router.put('/:table/:id', authenticateToken, authorizeRoles(1, 2), updateMetadataRecord);

export default router;