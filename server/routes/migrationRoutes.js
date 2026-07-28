import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import {
  getTables,
  getTableRelations,
  getTablePreview,
  startTransfer,
  getJobStatus
} from '../controllers/migrationController.js';

const router = express.Router();

router.use(authenticateToken, authorizeRoles('SUPER_ADMIN'));

router.get('/tables', getTables);
router.get('/tables/:table/relations', getTableRelations);
router.get('/tables/:table/preview', getTablePreview);
router.post('/transfer', startTransfer);
router.get('/jobs/:jobId', getJobStatus);

export default router;
