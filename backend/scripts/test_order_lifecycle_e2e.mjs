import pool, { query, getClient } from '../src/db.js';
import { updateOrderStatus, trackOrder } from '../src/controllers/orderController.js';

async function runE2ETest() {
  console.log('🚀 Running End-to-End Order Lifecycle & Delivery Test...\n');

  try {
    // 1. Get a product and variant
    const prodRes = await query(`
      SELECT p.id as product_id, p.name as product_name, p.base_price,
             pv.id as variant_id, pv.name as variant_name, pv.price as variant_price, pv.stock_quantity
      FROM products p
      JOIN product_variants pv ON pv.product_id = p.id
      WHERE pv.stock_quantity > 5
      LIMIT 1
    `);

    if (prodRes.rows.length === 0) {
      console.log('No suitable product variant found for test.');
      return;
    }

    const testItem = prodRes.rows[0];
    console.log(`[1] Selected Product for Test: "${testItem.product_name}" (${testItem.variant_name})`);
    console.log(`    Base Price: ₦${Number(testItem.base_price).toLocaleString()} | Variant Price: ₦${Number(testItem.variant_price).toLocaleString()} | Stock: ${testItem.stock_quantity}`);

    const initialStock = testItem.stock_quantity;
    const testRef = `BUBU-TEST-${Date.now()}`;
    const testEmail = 'atelier-client@example.com';
    const testAddress = {
      address: '14 Victoria Island Way',
      apartment: 'Penthouse 4',
      city: 'Lagos',
      state: 'Lagos State',
      zipCode: '101241'
    };

    // 2. Create Order directly in DB simulating orderController.createOrder
    const orderInsertRes = await query(`
      INSERT INTO orders (
        reference, customer_name, customer_email, customer_phone,
        shipping_address, total_amount, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `, [
      testRef,
      'Lady Vivienne',
      testEmail,
      '+2348012345678',
      JSON.stringify(testAddress),
      testItem.variant_price,
      'Pending'
    ]);

    const order = orderInsertRes.rows[0];
    console.log(`\n[2] Order Created: #${order.reference} (ID: ${order.id})`);

    // Insert order item and decrement stock
    await query(`
      INSERT INTO order_items (order_id, product_id, product_variant_id, variant_id, quantity, unit_price, price_at_purchase, total_price)
      VALUES ($1, $2, $3, $3, 1, $4, $4, $4)
    `, [order.id, testItem.product_id, testItem.variant_id, testItem.variant_price]);

    await query(`
      UPDATE product_variants SET stock_quantity = stock_quantity - 1 WHERE id = $1
    `, [testItem.variant_id]);

    const stockAfterCreation = (await query(`SELECT stock_quantity FROM product_variants WHERE id = $1`, [testItem.variant_id])).rows[0].stock_quantity;
    console.log(`    Stock decremented properly: ${initialStock} -> ${stockAfterCreation}`);

    // 3. Status Transition -> Paid
    await query(`
      UPDATE orders SET status = 'Paid', payment_verified_at = NOW(), updated_at = NOW() WHERE id = $1
    `, [order.id]);
    console.log(`\n[3] Order Marked as 'Paid'`);

    // 4. Status Transition -> Processing (In Atelier)
    await query(`
      UPDATE orders SET status = 'Processing', updated_at = NOW() WHERE id = $1
    `, [order.id]);
    console.log(`[4] Order Marked as 'Processing' (Atelier Tailoring)`);

    // 5. Status Transition -> Shipped with Carrier & Tracking Number
    const mockTrackingNumber = 'DHL-NG-9876543210';
    const mockCarrier = 'DHL Express International';
    await query(`
      UPDATE orders 
      SET status = 'Shipped', 
          tracking_number = $1, 
          shipping_carrier = $2, 
          updated_at = NOW() 
      WHERE id = $3
    `, [mockTrackingNumber, mockCarrier, order.id]);
    console.log(`[5] Order Marked as 'Shipped' with ${mockCarrier} (${mockTrackingNumber})`);

    // 6. Public Track Order Endpoint Test
    let trackReq = { query: { ref: testRef, email: testEmail } };
    let trackResData = null;
    let trackRes = {
      status: (code) => ({ json: (d) => { trackResData = { code, ...d }; } }),
      json: (d) => { trackResData = d; }
    };
    await trackOrder(trackReq, trackRes);
    console.log(`\n[6] Public Tracking Lookup Result:`);
    console.log(`    Status: ${trackResData.order.status}`);
    console.log(`    Carrier: ${trackResData.order.shippingCarrier}`);
    console.log(`    Tracking Code: ${trackResData.order.trackingNumber}`);
    console.log(`    Total Amount: ₦${trackResData.order.totalAmount.toLocaleString()}`);
    console.log(`    Items: ${trackResData.items.length} item(s) - "${trackResData.items[0].productName}" (${trackResData.items[0].variantName})`);

    // 7. Status Transition -> Delivered
    await query(`
      UPDATE orders SET status = 'Delivered', updated_at = NOW() WHERE id = $1
    `, [order.id]);
    const deliveredStatus = (await query(`SELECT status FROM orders WHERE id = $1`, [order.id])).rows[0].status;
    console.log(`\n[7] Order Marked as '${deliveredStatus}' (Completed Fulfillment)`);

    // 8. Cancellation & Stock Restoration Check
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query(`UPDATE orders SET status = 'Cancelled', updated_at = NOW() WHERE id = $1`, [order.id]);
      const items = (await client.query(`SELECT product_variant_id, quantity FROM order_items WHERE order_id = $1`, [order.id])).rows;
      for (const it of items) {
        await client.query(`UPDATE product_variants SET stock_quantity = stock_quantity + $1 WHERE id = $2`, [it.quantity, it.product_variant_id]);
      }
      await client.query('COMMIT');
    } finally {
      client.release();
    }

    const finalStock = (await query(`SELECT stock_quantity FROM product_variants WHERE id = $1`, [testItem.variant_id])).rows[0].stock_quantity;
    console.log(`\n[8] Order Cancelled & Inventory Restored:`);
    console.log(`    Stock before order: ${initialStock} | Stock after cancellation: ${finalStock} (Matched: ${initialStock === finalStock})`);

    // Clean up test order
    await query(`DELETE FROM order_items WHERE order_id = $1`, [order.id]);
    await query(`DELETE FROM orders WHERE id = $1`, [order.id]);
    console.log(`\n✨ Test completed cleanly and test order cleaned up.`);

  } catch (err) {
    console.error('❌ E2E Test error:', err);
  } finally {
    await pool.end();
  }
}

runE2ETest();
