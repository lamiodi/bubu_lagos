import express from 'express';
import { validateCoupon, createCoupon, getCoupons } from '../controllers/couponController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/validate', validateCoupon);
router.post('/admin/create', authenticateAdmin, createCoupon);
router.get('/admin/all', authenticateAdmin, getCoupons);

export default router;
