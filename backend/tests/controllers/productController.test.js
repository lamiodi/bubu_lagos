import { describe, it, expect, vi, beforeEach } from 'vitest';
import { query } from '../../src/db.js';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getRecommendations
} from '../../src/controllers/productController.js';

const mockQuery = vi.fn().mockResolvedValue({ rows: [] });
const mockClient = {
  query: vi.fn().mockImplementation(async (sql, params) => {
    const normalizedSql = typeof sql === 'string' ? sql.replace(/\s+/g, ' ') : '';
    if (normalizedSql.includes('INSERT INTO products')) {
      return { rows: [{ id: 'new-prod', name: 'New Product', base_price: 2500, category_id: 'cat-1' }] };
    }
    if (normalizedSql.includes('UPDATE products')) {
      if (params && params.includes('nonexistent')) {
        return { rows: [] };
      }
      return { rows: [{ id: 'prod-1', name: 'Updated Product', base_price: 3000, category_id: 'cat-1' }] };
    }
    if (normalizedSql.includes('FROM products')) {
      if (params && params.includes('prod-1')) {
        return { rows: [{ id: 'prod-1', name: 'Updated Product', base_price: 3000, category_id: 'cat-1' }] };
      }
      return { rows: [{ id: 'new-prod', name: 'New Product', base_price: 2500, category_id: 'cat-1' }] };
    }
    return { rows: [] };
  }),
  release: vi.fn()
};

vi.mock('../../src/db.js', () => ({
  query: (...args) => mockQuery(...args),
  getClient: vi.fn().mockImplementation(() => Promise.resolve(mockClient))
}));

describe('Product Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockReset().mockResolvedValue({ rows: [] });
    mockClient.release.mockReset();
    
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
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 'prod-1', name: 'Product 1', base_price: 1000, stock: 10 },
          { id: 'prod-2', name: 'Product 2', base_price: 2000, stock: 5 }
        ]
      });

      await getProducts(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should filter products by category', async () => {
      mockReq.query = { category: 'clothing' };
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'prod-1', name: 'Shirt', category_id: 'cat-1' }]
      });

      await getProducts(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should search products by name', async () => {
      mockReq.query = { search: 'dress' };
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'prod-1', name: 'Summer Dress' }]
      });

      await getProducts(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should sort products by price', async () => {
      mockReq.query = { sort: 'price_asc' };
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      mockQuery.mockResolvedValueOnce({
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
      mockQuery.mockResolvedValueOnce({
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
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await getProductById(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Product not found' });
    });
  });

  describe('getRecommendations', () => {
    it('should return recommended products using string comparison for excludeIds', async () => {
      mockReq.query = { productId: 'prod-1', limit: 1 };
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'prod-1', category_id: 'cat-1', color_palette: ['emerald'], suggested_product_ids: [] }]
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'prod-2', name: 'Emerald Silk Dress', base_price: '45000', category_id: 'cat-1' }]
      });

      await getRecommendations(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        products: expect.any(Array)
      }));
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

      await updateProduct(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Updated Product'
      }));
    });

    it('should return 404 if product not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockReq.body = { name: 'Updated' };

      await updateProduct(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteProduct', () => {
    it('should delete a product', async () => {
      mockReq.params = { id: 'prod-1' };
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'prod-1' }] });

      await deleteProduct(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Product deleted successfully' });
    });

    it('should return 404 if product not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await deleteProduct(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });
});
