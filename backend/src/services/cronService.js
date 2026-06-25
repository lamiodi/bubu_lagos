import { query, getClient } from '../db.js';

// ---------------------------------------------------------------------------
// Self-pinger — keeps the Render free-tier instance from spinning down by
// hitting our own /api/health endpoint every 14 minutes. Render's free plan
// sleeps after 15 minutes of inactivity, so this stays just under that.
// ---------------------------------------------------------------------------
const HEALTH_URL = process.env.HEALTH_URL || 'http://localhost:5000/api/health';

const selfPing = async () => {
  try {
    const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(10000) });
    console.log(`[self-ping] ${res.status} ${res.statusText}`);
  } catch (err) {
    console.warn(`[self-ping] failed: ${err.message}`);
  }
};

export const cleanupPendingOrders = async () => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Find orders that have been pending for more than 30 minutes
    const oldPendingOrdersResult = await client.query(
      `SELECT id, reference FROM orders 
       WHERE status = 'Pending' 
       AND created_at < NOW() - INTERVAL '30 minutes'
       FOR UPDATE`
    );

    for (const order of oldPendingOrdersResult.rows) {
      console.log(`Cleaning up expired pending order: ${order.reference}`);

      // Get items for this order to restore stock
      const itemsResult = await client.query(
        `SELECT product_variant_id, quantity FROM order_items WHERE order_id = $1`,
        [order.id]
      );

      for (const item of itemsResult.rows) {
        await client.query(
          `UPDATE product_variants 
           SET stock_quantity = stock_quantity + $1 
           WHERE id = $2`,
          [item.quantity, item.product_variant_id]
        );
      }

      // Mark order as Cancelled or Expired
      await client.query(
        `UPDATE orders SET status = 'Cancelled', updated_at = NOW() WHERE id = $1`,
        [order.id]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Pending orders cleanup error:', err);
  } finally {
    client.release();
  }
};

export const startCronJobs = () => {
  // Self-ping every 14 minutes to keep Render free tier awake
  setInterval(selfPing, 14 * 60 * 1000);
  // Run every 15 minutes
  setInterval(cleanupPendingOrders, 15 * 60 * 1000);
  console.log('Cron jobs started (self-ping every 14m, pending orders cleanup every 15m)');
};
