import express from 'express';
import { uploadProductImages, deleteProductImage } from '../controllers/uploadController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/products', authenticateAdmin, uploadProductImages);
router.delete('/products/:filename', authenticateAdmin, deleteProductImage);

export default router;
