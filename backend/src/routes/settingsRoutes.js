import express from 'express';
import {
  getSettings,
  updateSettings,
  getDashboardStats
} from '../controllers/settingsController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getSettings);
router.put('/', authenticateAdmin, updateSettings);
router.get('/dashboard-stats', authenticateAdmin, getDashboardStats);

export default router;
