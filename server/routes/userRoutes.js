import express from 'express';
import { createUser, getDashboardInitData } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { FormMeta } from '../models/DynamicMetaSchemas.js';

const router = express.Router();


router.post('/create', authenticateToken, authorizeRoles(1), createUser);
router.get('/dashboard-init', authenticateToken, getDashboardInitData);

router.get('/meta/form/:formCode', async (req, res) => {
  try {
    const blueprint = await FormMeta.findOne({ form_code: req.params.formCode });
    return res.json(blueprint || { fields: [] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;