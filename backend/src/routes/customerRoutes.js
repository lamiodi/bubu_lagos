// ===========================================================================
// customerRoutes.js — guest-checkout edition
//
// All customer-facing auth/address/profile endpoints have been removed.
// The store is guest-only; customers are anonymous contacts created by
// orderController.createOrder, and the only routes here are admin-side.
// ===========================================================================

import express from 'express';
import {
  getAllCustomers,
  getCustomerById,
  toggleCustomerStatus,
} from '../controllers/customerController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin-only routes
router.get('/admin/all',          authenticateAdmin, getAllCustomers);
router.get('/admin/:id',          authenticateAdmin, getCustomerById);
router.put('/admin/:id/status',   authenticateAdmin, toggleCustomerStatus);

export default router;
