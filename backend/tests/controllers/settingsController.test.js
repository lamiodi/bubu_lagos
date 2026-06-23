import { describe, it, expect, vi, beforeEach } from 'vitest';
import { query } from '../../src/db.js';
import {
  getSettings,
  updateSettings,
  getDashboardStats
} from '../../src/controllers/settingsController.js';

vi.mock('../../src/db.js');

describe('Settings Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = {
      body: {}
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  });

  describe('getSettings', () => {
    it('should return store settings', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          store_name: 'Bubu Lagos',
          store_email: 'hello@bubulagos.com',
          store_phone: '+234123456789',
          store_address: '123 Main St, Lagos',
          currency: 'NGN',
          shipping_fee: 1500
        }]
      });

      await getSettings(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        store_name: 'Bubu Lagos',
        currency: 'NGN'
      }));
    });

    it('should return default settings if none exist', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await getSettings(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        store_name: 'Bubu Lagos',
        currency: 'NGN',
        shipping_fee: 0
      }));
    });
  });

  describe('updateSettings', () => {
    it('should update store settings', async () => {
      mockReq.body = {
        storeName: 'Updated Store',
        storeEmail: 'new@email.com',
        storePhone: '+234987654321',
        storeAddress: '456 New St',
        currency: 'USD',
        shippingFee: 2000
      };
      query.mockResolvedValueOnce({
        rows: [{
          store_name: 'Updated Store',
          store_email: 'new@email.com',
          store_phone: '+234987654321',
          store_address: '456 New St',
          currency: 'USD',
          shipping_fee: 2000
        }]
      });

      await updateSettings(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        store_name: 'Updated Store',
        currency: 'USD'
      }));
    });

    it('should handle partial updates', async () => {
      mockReq.body = {
        storeName: 'Partial Update'
      };
      query.mockResolvedValueOnce({
        rows: [{
          store_name: 'Partial Update',
          store_email: 'hello@bubulagos.com',
          currency: 'NGN'
        }]
      });

      await updateSettings(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      query.mockResolvedValueOnce({ rows: [{ count: '150' }] });
      query.mockResolvedValueOnce({ rows: [{ sum: '750000' }] });
      query.mockResolvedValueOnce({ rows: [{ count: '75' }] });
      query.mockResolvedValueOnce({ rows: [{ count: '40' }] });
      query.mockResolvedValueOnce({
        rows: [
          { date: '2024-01-01', total: '25000' },
          { date: '2024-01-02', total: '30000' }
        ]
      });

      await getDashboardStats(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        totalOrders: 150,
        totalRevenue: 750000,
        totalProducts: 75,
        totalCustomers: 40,
        recentOrders: expect.any(Array)
      }));
    });

    it('should handle null revenue', async () => {
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      query.mockResolvedValueOnce({ rows: [{ sum: null }] });
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      query.mockResolvedValueOnce({ rows: [] });

      await getDashboardStats(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        totalRevenue: 0
      }));
    });
  });
});
