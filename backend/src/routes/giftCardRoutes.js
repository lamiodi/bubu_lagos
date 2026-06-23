import express from 'express';
import {
  createGiftCard,
  purchaseGiftCard,
  validateGiftCard,
  applyGiftCard,
  getGiftCards,
  getGiftCardLogs
} from '../controllers/giftCardController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/validate/:code', validateGiftCard);
router.post('/apply', applyGiftCard);
router.post('/purchase', purchaseGiftCard);

// Admin routes
router.post('/admin/create', authenticateAdmin, createGiftCard);
router.get('/admin/all', authenticateAdmin, getGiftCards);
router.get('/admin/logs/:id', authenticateAdmin, getGiftCardLogs);

export default router;
