import express from 'express';
import { subscribeNewsletter, getSubscribers } from '../controllers/marketingController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public
router.post('/subscribe', subscribeNewsletter);

// Admin
router.get('/subscribers', authenticateAdmin, getSubscribers);

export default router;
