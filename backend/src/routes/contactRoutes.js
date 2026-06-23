import express from 'express';
import { submitContactMessage, getContactMessages } from '../controllers/contactController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route for contact form submission
router.post('/', submitContactMessage);

// Admin route
router.get('/', authenticateAdmin, getContactMessages);

export default router;