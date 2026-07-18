import express from 'express';
import { createMenuItem, getAllMenusFlat, getAuthorizedSidebar, updateMenuItem, deleteMenuItem } from '../controllers/menuController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Dynamic Sidebar construction route (Open to any authenticated profile dashboard)
router.get('/sidebar', authenticateToken, getAuthorizedSidebar);

// Menu Administrative System Management Routes (Strictly Super Admin Only)
router.post('/', authenticateToken, authorizeRoles(1), createMenuItem);
router.get('/', authenticateToken, authorizeRoles(1), getAllMenusFlat);
router.put('/:id', authenticateToken, authorizeRoles(1), updateMenuItem);
router.delete('/:id', authenticateToken, authorizeRoles(1), deleteMenuItem);

export default router;