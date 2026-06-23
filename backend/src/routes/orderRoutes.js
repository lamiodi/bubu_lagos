import express from 'express';
import {
  createOrder,
  getOrderById,
  updateOrderStatus,
  bulkUpdateStatus,
  verifyPayment,
  getOrders,
  trackOrder,
} from '../controllers/orderController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';
import { trackOrderLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

// Public routes (guest checkout).
// The Paystack webhook lives at /api/webhooks/paystack (see routes/webhookRoutes.js).
// DO NOT re-add a webhook handler here — the previous implementation used
// JSON.stringify(req.body) for HMAC verification, which is not byte-equal
// to the raw body Paystack signed, so it never matched.
//
// /verify/:reference and /track require both the reference AND the email
// used at checkout. Together they form a 2-factor "proof of purchase":
// the ref is a 24-char token (random) and the email is something only
// the buyer knows. Without both, we return 404 — no enumeration.
router.post('/', createOrder);
router.get('/verify/:reference', trackOrderLimiter, verifyPayment);
router.get('/track',            trackOrderLimiter, trackOrder); // MUST come before /:id

// Admin protected routes
router.get('/', authenticateAdmin, getOrders);
router.get('/:id', authenticateAdmin, getOrderById);
router.put('/:id/status', authenticateAdmin, updateOrderStatus);
router.put('/bulk-status', authenticateAdmin, bulkUpdateStatus);

export default router;