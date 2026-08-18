import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  trackOrder,
  updateOrderStatus,
  bulkUpdateStatus,
  verifyPayment,
  getOrderById,
  getOrders
} from '../../src/controllers/orderController.js';

const mockQuery = vi.fn();
const mockClient = {
  query: vi.fn(),
  release: vi.fn()
};

vi.mock('../../src/db.js', () => ({
  query: (...args) => mockQuery(...args),
  getClient: vi.fn().mockImplementation(() => Promise.resolve(mockClient))
}));

vi.mock('../../src/services/emailService.js', () => ({
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue({ id: 'msg_1' }),
  sendShippingUpdateEmail: vi.fn().mockResolvedValue({ id: 'msg_2' }),
  sendDeliveryEmail: vi.fn().mockResolvedValue({ id: 'msg_3' }),
  formatAddress: vi.fn().mockReturnValue('123 Lagos Way, Lagos, Nigeria')
}));

describe('Order Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockReset();
    mockClient.query.mockReset();
    mockClient.release.mockReset();

    mockReq = {
      body: {},
      params: {},
      query: {}
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  });

  describe('trackOrder', () => {
    it('should return 400 if reference or email is missing', async () => {
      mockReq.query = { ref: 'BUBU-123' };
      await trackOrder(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);

      mockReq.query = { email: 'client@example.com' };
      await trackOrder(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if order is not found for reference and email pair', async () => {
      mockReq.query = { ref: 'BUBU-UNKNOWN', email: 'unknown@example.com' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await trackOrder(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Order not found' });
    });

    it('should return sanitized order with tracking details and items', async () => {
      mockReq.query = { ref: 'BUBU-100', email: 'client@example.com' };
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'order-1',
          reference: 'BUBU-100',
          status: 'Shipped',
          customer_name: 'Amaka Obi',
          customer_email: 'client@example.com',
          customer_phone: '+2348000000000',
          shipping_address: '123 Victoria Island, Lagos',
          total_amount: '150000',
          payment_verified_at: new Date().toISOString(),
          tracking_number: 'DHL-12345678',
          shipping_carrier: 'DHL Express',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          product_name: 'Oma Silk Bubu',
          variant_name: 'Universal Fit',
          quantity: 1,
          unit_price: '150000',
          total_price: '150000',
          images: ['https://example.com/oma.jpg']
        }]
      });

      await trackOrder(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        order: expect.objectContaining({
          reference: 'BUBU-100',
          status: 'Shipped',
          trackingNumber: 'DHL-12345678',
          shippingCarrier: 'DHL Express',
          totalAmount: 150000
        }),
        items: expect.arrayContaining([
          expect.objectContaining({
            productName: 'Oma Silk Bubu',
            unitPrice: 150000
          })
        ])
      }));
    });
  });

  describe('updateOrderStatus', () => {
    it('should reject invalid statuses', async () => {
      mockReq.params = { id: 'order-1' };
      mockReq.body = { status: 'InvalidStatus' };

      await updateOrderStatus(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should update status to Delivered and send delivery email', async () => {
      mockReq.params = { id: 'order-1' };
      mockReq.body = { status: 'Delivered' };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ // SELECT FOR UPDATE
          rows: [{ id: 'order-1', reference: 'BUBU-100', status: 'Shipped', customer_email: 'client@example.com' }]
        })
        .mockResolvedValueOnce({ // UPDATE orders
          rows: [{
            id: 'order-1',
            reference: 'BUBU-100',
            status: 'Delivered',
            customer_email: 'client@example.com',
            customer_name: 'Amaka',
            updated_at: new Date().toISOString()
          }]
        })
        .mockResolvedValueOnce({}); // COMMIT

      await updateOrderStatus(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'Delivered',
        message: 'Order status updated to Delivered'
      }));
    });

    it('should restore variant stock when order is cancelled', async () => {
      mockReq.params = { id: 'order-1' };
      mockReq.body = { status: 'Cancelled' };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ // SELECT FOR UPDATE
          rows: [{ id: 'order-1', reference: 'BUBU-100', status: 'Paid', customer_email: 'client@example.com' }]
        })
        .mockResolvedValueOnce({ // UPDATE orders to Cancelled
          rows: [{ id: 'order-1', reference: 'BUBU-100', status: 'Cancelled', customer_email: 'client@example.com' }]
        })
        .mockResolvedValueOnce({ // SELECT order_items
          rows: [{ product_variant_id: 'var-1', quantity: 2 }]
        })
        .mockResolvedValueOnce({ rows: [] }) // UPDATE product_variants (restore stock)
        .mockResolvedValueOnce({}); // COMMIT

      await updateOrderStatus(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'Cancelled',
        message: 'Order status updated to Cancelled'
      }));
    });
  });

  describe('bulkUpdateStatus', () => {
    it('should validate inputs for bulk update', async () => {
      mockReq.body = { ids: [], status: 'Delivered' };
      await bulkUpdateStatus(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);

      mockReq.body = { ids: ['order-1'], status: 'InvalidStatus' };
      await bulkUpdateStatus(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should update multiple orders to Delivered', async () => {
      mockReq.body = { ids: ['order-1', 'order-2'], status: 'Delivered' };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ // UPDATE orders
          rowCount: 2,
          rows: [
            { id: 'order-1', reference: 'BUBU-100', status: 'Delivered', customer_email: 'a@example.com', customer_name: 'A' },
            { id: 'order-2', reference: 'BUBU-101', status: 'Delivered', customer_email: 'b@example.com', customer_name: 'B' }
          ]
        })
        .mockResolvedValueOnce({}); // COMMIT

      await bulkUpdateStatus(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        updatedCount: 2,
        message: '2 order(s) updated to Delivered'
      }));
    });
  });

  describe('verifyPayment', () => {
    it('should return already confirmed status if order is already Paid', async () => {
      mockReq.params = { reference: 'BUBU-PAID-REF' };
      mockReq.query = { email: 'client@example.com' };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ // SELECT FOR UPDATE
          rows: [{
            id: 'order-1',
            reference: 'BUBU-PAID-REF',
            status: 'Paid',
            total_amount: '150000',
            customer_email: 'client@example.com',
            payment_verified_at: new Date().toISOString()
          }]
        })
        .mockResolvedValueOnce({}); // ROLLBACK

      await verifyPayment(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        order: expect.objectContaining({
          status: 'Paid',
          reference: 'BUBU-PAID-REF'
        })
      }));
    });
  });
});
