import express from 'express';
import {
  adminLogin,
  getMe,
  getDashboardStats,
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser
} from '../controllers/adminController.js';
import { markMessageRead } from '../controllers/contactController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiters.js';
import { validateLoginBody } from '../middleware/validators.js';

const router = express.Router();

// Public admin routes
router.post('/login', authLimiter, validateLoginBody, adminLogin);

// Protected admin routes
router.get('/me', authenticateAdmin, getMe);
router.get('/dashboard/stats', authenticateAdmin, getDashboardStats);
router.get('/users', authenticateAdmin, getAdminUsers);
router.post('/users', authenticateAdmin, createAdminUser);
router.put('/users/:id', authenticateAdmin, updateAdminUser);
router.delete('/users/:id', authenticateAdmin, deleteAdminUser);

// Admin message moderation
router.put('/messages/:id/read', authenticateAdmin, markMessageRead);

export default router;