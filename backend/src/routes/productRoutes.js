import express from 'express';
import {
  getProducts,
  getProductById,
  getRecommendations,
  createProduct,
  updateProduct,
  deleteProduct,
  updateVariantStock,
  createProductsBulk
} from '../controllers/productController.js';
import { upload } from '../config/cloudinary.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/recommendations', getRecommendations);
router.get('/:id', getProductById);

const handleUpload = (fields) => (req, res, next) => {
  upload.fields(fields)(req, res, (err) => {
    if (err) {
      console.error('[Multer/Cloudinary Upload Error]:', err);
      return res.status(400).json({
        error: `File upload failed: ${err.message || 'Check Cloudinary config or file parameters'}`
      });
    }
    next();
  });
};

// Admin protected routes
router.post('/bulk', authenticateAdmin, createProductsBulk);

router.post('/', authenticateAdmin, handleUpload([
  { name: 'images', maxCount: 10 },
  { name: 'video', maxCount: 1 }
]), createProduct);

router.put('/:id', authenticateAdmin, handleUpload([
  { name: 'images', maxCount: 10 },
  { name: 'video', maxCount: 1 }
]), updateProduct);
router.delete('/:id', authenticateAdmin, deleteProduct);
router.put('/:productId/variants/:variantId/stock', authenticateAdmin, updateVariantStock);

export default router;