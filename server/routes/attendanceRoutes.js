import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import {
  getTodayStatus,
  markAttendance,
  listRecords,
  getMonthlySummary
} from '../controllers/attendanceController.js';

const router = express.Router();

router.get('/today', authenticateToken, getTodayStatus);
router.post('/mark', authenticateToken, markAttendance);

router.get('/admin/records', authenticateToken, authorizeRoles('SUPER_ADMIN'), listRecords);
router.get('/admin/summary', authenticateToken, authorizeRoles('SUPER_ADMIN'), getMonthlySummary);

export default router;
