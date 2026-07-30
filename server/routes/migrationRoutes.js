import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { parseUpload, startTransfer, getJobStatus } from '../controllers/migrationController.js';

const router = express.Router();

// Dump files are only parsed in-memory and never need to persist to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 10 }
});

router.use(authenticateToken, authorizeRoles('SUPER_ADMIN'));

router.post('/parse', upload.array('files', 10), parseUpload);
router.post('/transfer', startTransfer);
router.get('/jobs/:jobId', getJobStatus);

export default router;
