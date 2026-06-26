import { query, getClient } from '../db.js';

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
  // Run every 15 minutes
  setInterval(cleanupPendingOrders, 15 * 60 * 1000);
  console.log('Cron jobs started (pending orders cleanup every 15m)');
};
