import express from 'express';
import {
  getCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  deleteCollection
} from '../controllers/collectionController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getCollections);
router.get('/:id', getCollectionById);

// Admin protected routes
router.post('/', authenticateAdmin, createCollection);
router.put('/:id', authenticateAdmin, updateCollection);
router.delete('/:id', authenticateAdmin, deleteCollection);

export default router;
