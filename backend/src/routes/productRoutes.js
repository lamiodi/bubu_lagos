import express from 'express';
import {
  getProducts,
  getProductById,
  getRecommendations,
  createProduct,
  updateProduct,
  deleteProduct,
  updateVariantStock
} from '../controllers/productController.js';
import { upload } from '../config/cloudinary.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/recommendations', getRecommendations);
router.get('/:id', getProductById);

// Admin protected routes
router.post('/', authenticateAdmin, upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'video', maxCount: 1 }
]), createProduct);

router.put('/:id', authenticateAdmin, upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'video', maxCount: 1 }
]), updateProduct);
router.delete('/:id', authenticateAdmin, deleteProduct);
router.put('/:productId/variants/:variantId/stock', authenticateAdmin, updateVariantStock);

export default router;