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
          setting_key: 'store_name',
          setting_value: 'Bubu Lagos'
        }, {
          setting_key: 'currency',
          setting_value: 'NGN'
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
        currency: 'NGN'
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
      query.mockResolvedValue({
        rows: [{
          setting_key: 'store_name',
          setting_value: 'Updated Store'
        }, {
          setting_key: 'currency',
          setting_value: 'USD'
        }]
      });

      await updateSettings(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Settings updated successfully',
        settings: expect.objectContaining({
          store_name: 'Updated Store',
          currency: 'USD'
        })
      }));
    });

    it('should handle partial updates', async () => {
      mockReq.body = {
        storeName: 'Partial Update'
      };
      query.mockResolvedValue({
        rows: [{
          setting_key: 'store_name',
          setting_value: 'Partial Update'
        }]
      });

      await updateSettings(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      query.mockResolvedValueOnce({ rows: [{ total_orders: '150', total_revenue: '750000' }] });
      query.mockResolvedValueOnce({ rows: [{ total_products: '75' }] });
      query.mockResolvedValueOnce({ rows: [{ total_customers: '40' }] });
      query.mockResolvedValueOnce({
        rows: [
          { id: 'ord-1', reference: 'REF123', total_amount: '25000', status: 'Paid', created_at: '2024-01-01' }
        ]
      });
      query.mockResolvedValueOnce({ rows: [] });

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
      query.mockResolvedValueOnce({ rows: [{ total_orders: '0', total_revenue: '0' }] });
      query.mockResolvedValueOnce({ rows: [{ total_products: '0' }] });
      query.mockResolvedValueOnce({ rows: [{ total_customers: '0' }] });
      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({ rows: [] });

      await getDashboardStats(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        totalRevenue: 0
      }));
    });
  });
});
