import { describe, it, expect, vi, beforeEach } from 'vitest';
import { query } from '../../src/db.js';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories
} from '../../src/controllers/productController.js';

vi.mock('../../src/db.js');

describe('Product Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = {
      body: {},
      params: {},
      query: {},
      file: null
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  });

  describe('getProducts', () => {
    it('should return all products with pagination', async () => {
      mockReq.query = { page: '1', limit: '12' };
      query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      query.mockResolvedValueOnce({
        rows: [
          { id: 'prod-1', name: 'Product 1', price: 1000, stock: 10 },
          { id: 'prod-2', name: 'Product 2', price: 2000, stock: 5 }
        ]
      });

      await getProducts(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        products: expect.any(Array),
        pagination: expect.any(Object)
      }));
    });

    it('should filter products by category', async () => {
      mockReq.query = { category: 'clothing' };
      query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      query.mockResolvedValueOnce({
        rows: [{ id: 'prod-1', name: 'Shirt', category_id: 'cat-1' }]
      });

      await getProducts(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should search products by name', async () => {
      mockReq.query = { search: 'dress' };
      query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      query.mockResolvedValueOnce({
        rows: [{ id: 'prod-1', name: 'Summer Dress' }]
      });

      await getProducts(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should sort products by price', async () => {
      mockReq.query = { sort: 'price_asc' };
      query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      query.mockResolvedValueOnce({
        rows: [
          { id: 'prod-1', name: 'Cheap', price: 100 },
          { id: 'prod-2', name: 'Expensive', price: 500 }
        ]
      });

      await getProducts(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('getProductById', () => {
    it('should return a product by ID', async () => {
      mockReq.params = { id: 'prod-1' };
      query.mockResolvedValueOnce({
        rows: [{
          id: 'prod-1',
          name: 'Test Product',
          price: 1500,
          stock: 20,
          category_id: 'cat-1',
          category_name: 'Clothing'
        }]
      });

      await getProductById(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        id: 'prod-1',
        name: 'Test Product'
      }));
    });

    it('should return 404 if product not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      query.mockResolvedValueOnce({ rows: [] });

      await getProductById(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Product not found' });
    });
  });

  describe('createProduct', () => {
    it('should create a new product', async () => {
      mockReq.body = {
        name: 'New Product',
        description: 'A great product',
        price: 2500,
        stock: 15,
        categoryId: 'cat-1'
      };
      query.mockResolvedValueOnce({
        rows: [{
          id: 'new-prod',
          name: 'New Product',
          description: 'A great product',
          price: 2500,
          stock: 15,
          category_id: 'cat-1'
        }]
      });

      await createProduct(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        id: 'new-prod',
        name: 'New Product'
      }));
    });

    it('should return 400 if required fields are missing', async () => {
      mockReq.body = { name: 'Incomplete Product' };
      await createProduct(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updateProduct', () => {
    it('should update an existing product', async () => {
      mockReq.params = { id: 'prod-1' };
      mockReq.body = {
        name: 'Updated Product',
        price: 3000,
        stock: 25
      };
      query.mockResolvedValueOnce({
        rows: [{
          id: 'prod-1',
          name: 'Updated Product',
          price: 3000,
          stock: 25
        }]
      });

      await updateProduct(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Updated Product'
      }));
    });

    it('should return 404 if product not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockReq.body = { name: 'Updated' };
      query.mockResolvedValueOnce({ rows: [] });

      await updateProduct(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteProduct', () => {
    it('should delete a product', async () => {
      mockReq.params = { id: 'prod-1' };
      query.mockResolvedValueOnce({ rows: [{ id: 'prod-1' }] });

      await deleteProduct(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Product deleted successfully' });
    });

    it('should return 404 if product not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      query.mockResolvedValueOnce({ rows: [] });

      await deleteProduct(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getCategories', () => {
    it('should return all categories', async () => {
      query.mockResolvedValueOnce({
        rows: [
          { id: 'cat-1', name: 'Clothing', slug: 'clothing' },
          { id: 'cat-2', name: 'Accessories', slug: 'accessories' }
        ]
      });

      await getCategories(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ id: 'cat-1' })
      ]));
    });
  });
});
