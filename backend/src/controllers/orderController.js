import { query, getClient } from '../db.js';
import Paystack from 'paystack';
import crypto from 'crypto';
import { sendOrderConfirmationEmail, sendShippingUpdateEmail } from '../services/emailService.js';

const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);

export const createOrder = async (req, res) => {
  const client = await getClient();

  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      items,
      totalAmount,
      subscribeNewsletter,
      giftCardCode,
      couponCode
    } = req.body;

    // Validate required fields
    if (!customerName || !customerEmail || !customerPhone || !shippingAddress) {
      return res.status(400).json({ error: 'Customer information and shipping address are required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ error: 'Valid total amount is required' });
    }

    await client.query('BEGIN');

    // Validate stock availability and calculate actual total
    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      if (!item.variantId || !item.quantity || item.quantity <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Each item must have variantId and positive quantity' });
      }

      // Get variant details with product info, using FOR UPDATE to prevent race conditions
      const variantResult = await client.query(
        `SELECT pv.*, p.name as product_name, p.base_price as product_base_price
         FROM product_variants pv
         JOIN products p ON pv.product_id = p.id
         WHERE pv.id = $1 FOR UPDATE`,
        [item.variantId]
      );

      if (variantResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Variant ${item.variantId} not found` });
      }

      const variant = variantResult.rows[0];

      if (variant.stock_quantity < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Insufficient stock for ${variant.name}. Available: ${variant.stock_quantity}, Requested: ${item.quantity}`
        });
      }

      const itemPrice = parseFloat(variant.price);
      const itemTotal = itemPrice * item.quantity;
      calculatedTotal += itemTotal;

      validatedItems.push({
        variant,
        quantity: item.quantity,
        price: itemPrice,
        itemTotal
      });
    }

    // Validate total amount matches calculated total (allow small difference for rounding)
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Total amount mismatch. Calculated: ${calculatedTotal.toFixed(2)}, Provided: ${totalAmount}`
      });
    }

    // Generate order reference.
    // Format: BUBU-<unix-ms>-<8 hex chars from crypto.randomBytes(4)>.
    // The random suffix is 4 bytes (32 bits) of crypto-strong entropy
    // on top of the millisecond timestamp. This makes the reference
    // unguessable: an attacker who knows the timestamp of the order
    // (leaked by the admin, say) still needs to guess ~4.3B values.
    // Combined with the email 2nd factor on the public lookup, the
    // effective guess space is 2^32 × 2^32 = 2^64.
    const orderReference = `BUBU-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Parse customer name into first and last name
    const nameParts = customerName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Upsert guest contact (match by email OR phone to avoid duplicates).
    // We don't need the returned id anymore — orders are denormalised
    // onto the order row itself, and the customers table is just a
    // contact list (see getAllCustomers in customerController).
    const existingCustomerResult = await client.query(
      `SELECT id FROM customers WHERE email = $1 OR (phone = $2 AND phone IS NOT NULL AND phone != '')`,
      [customerEmail.toLowerCase(), customerPhone]
    );

    if (existingCustomerResult.rows.length > 0) {
      // Backfill any missing fields from this checkout.
      await client.query(
        `UPDATE customers
         SET first_name = COALESCE(NULLIF(first_name, ''), $1),
             last_name = COALESCE(NULLIF(last_name, ''), $2),
             phone = COALESCE(NULLIF(phone, ''), $3),
             updated_at = NOW()
         WHERE id = $4`,
        [firstName, lastName, customerPhone, existingCustomerResult.rows[0].id]
      );
    } else {
      // Guest checkout. is_active column no longer exists on customers
      // (removed in migration 016) — every customer IS a guest now.
      await client.query(
        `INSERT INTO customers (email, first_name, last_name, phone, is_guest)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (email) DO NOTHING`,
        [customerEmail.toLowerCase(), firstName, lastName, customerPhone]
      );
    }

    // Handle Newsletter Subscription
    if (subscribeNewsletter) {
      await client.query(
        `INSERT INTO newsletter_subscribers (email) 
         VALUES ($1) 
         ON CONFLICT (email) DO UPDATE SET is_active = true`,
        [customerEmail.toLowerCase()]
      ).catch(err => console.error('Newsletter subscription error:', err));
    }

    // --- Coupon Logic ---
    let couponDiscount = 0;
    let couponId = null;

    if (couponCode) {
      const couponResult = await client.query(
        `SELECT * FROM coupons WHERE code = $1 AND is_active = true FOR UPDATE`,
        [couponCode.toUpperCase()]
      );

      if (couponResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid coupon code' });
      }

      const coupon = couponResult.rows[0];

      // Check expiry
      if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Coupon has expired' });
      }

      // Check usage limit
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Coupon usage limit reached' });
      }

      // Check minimum order amount
      if (totalAmount < parseFloat(coupon.min_order_amount)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Minimum order amount for this coupon is ₦${parseFloat(coupon.min_order_amount).toLocaleString()}` 
        });
      }

      if (coupon.type === 'Percentage') {
        couponDiscount = (totalAmount * parseFloat(coupon.value)) / 100;
        if (coupon.max_discount_amount) {
          couponDiscount = Math.min(couponDiscount, parseFloat(coupon.max_discount_amount));
        }
      } else if (coupon.type === 'Fixed') {
        couponDiscount = parseFloat(coupon.value);
      }

      couponDiscount = Math.min(couponDiscount, totalAmount);
      couponId = coupon.id;

      // Update coupon usage
      await client.query(
        `UPDATE coupons SET used_count = used_count + 1, updated_at = NOW() WHERE id = $1`,
        [couponId]
      );
    }

    const totalAfterCoupon = totalAmount - couponDiscount;

    // --- Gift Card Logic ---
    let giftCardAmount = 0;
    let giftCardId = null;

    if (giftCardCode) {
      const codeHash = crypto.createHash('sha256').update(giftCardCode.toUpperCase()).digest('hex');
      const gcResult = await client.query(
        `SELECT * FROM gift_cards WHERE code_hash = $1 AND status = 'Active' AND expiry_date > NOW() FOR UPDATE`,
        [codeHash]
      );

      if (gcResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid or expired gift card' });
      }

      const card = gcResult.rows[0];
      const cardBalance = parseFloat(card.current_balance);
      
      if (cardBalance <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Gift card has no remaining balance' });
      }

      giftCardAmount = Math.min(cardBalance, totalAfterCoupon);
      giftCardId = card.id;

      // Update card balance
      const newCardBalance = cardBalance - giftCardAmount;
      const newStatus = newCardBalance === 0 ? 'Fully_Redeemed' : 'Active';
      await client.query(
        `UPDATE gift_cards SET current_balance = $1, status = $2, updated_at = NOW() WHERE id = $3`,
        [newCardBalance, newStatus, giftCardId]
      );
    }

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (
        customer_name,
        customer_email,
        customer_phone,
        shipping_address,
        total_amount,
        reference,
        status,
        gift_card_amount,
        gift_card_id,
        coupon_id,
        coupon_discount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress,
        totalAmount,
        orderReference,
        'Pending',
        giftCardAmount,
        giftCardId,
        couponId,
        couponDiscount
      ]
    );

    const order = orderResult.rows[0];
    const orderId = order.id;

    // Log Gift Card use if applicable
    if (giftCardId) {
       await client.query(
        `INSERT INTO gift_card_logs (gift_card_id, order_id, amount_used, balance_before, balance_after, transaction_type)
         VALUES ($1, $2, $3, $4, $5, 'Redemption')`,
        [giftCardId, orderId, giftCardAmount, parseFloat(gcResult.rows[0].current_balance), parseFloat(gcResult.rows[0].current_balance) - giftCardAmount]
      );
    }

    // Create order items and update stock
    for (const item of validatedItems) {
      // Create order item
      await client.query(
        `INSERT INTO order_items (
          order_id,
          product_id,
          product_variant_id,
          quantity,
          unit_price,
          total_price
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          orderId,
          item.variant.product_id,
          item.variant.id,
          item.quantity,
          item.price,
          item.itemTotal
        ]
      );

      // Update variant stock
      await client.query(
        `UPDATE product_variants 
         SET stock_quantity = stock_quantity - $1
         WHERE id = $2`,
        [item.quantity, item.variant.id]
      );
    }

    // Initialize Paystack payment if there's a balance remaining
    const remainingAmount = totalAmount - couponDiscount - giftCardAmount;

    if (remainingAmount <= 0) {
      // Order fully paid via gift card
      await client.query(
        `UPDATE orders SET status = 'Paid', payment_verified_at = NOW() WHERE id = $1`,
        [orderId]
      );
      
      await client.query('COMMIT');

      return res.status(201).json({
        order: {
          id: order.id,
          reference: order.reference,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          totalAmount: parseFloat(order.total_amount),
          status: 'Paid',
          createdAt: order.created_at
        },
        payment: null,
        message: 'Order placed successfully (Paid via Gift Card).'
      });
    }

    const paymentData = {
      email: customerEmail,
      amount: Math.round(remainingAmount * 100), // Convert to kobo
      reference: orderReference,
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/verify`,
      metadata: {
        orderId,
        customerName,
        customerPhone
      }
    };

    const paymentResponse = await paystack.transaction.initialize(paymentData);

    if (!paymentResponse.status) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Failed to initialize payment' });
    }

    await client.query('COMMIT');

    res.status(201).json({
      order: {
        id: order.id,
        reference: order.reference,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        totalAmount: parseFloat(order.total_amount),
        remainingAmount: parseFloat(remainingAmount),
        status: order.status,
        createdAt: order.created_at
      },
      payment: {
        authorizationUrl: paymentResponse.data.authorization_url,
        accessCode: paymentResponse.data.access_code,
        reference: paymentResponse.data.reference
      },
      message: 'Order created successfully. Proceed to payment.'
    });

  } catch (error) {
    await client.query('ROLLBACK').catch(() => { });
    console.error('Error creating order:', error);

    if (error.response && error.response.data) {
      return res.status(400).json({ error: error.response.data.message || 'Payment initialization failed' });
    }

    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;
    // Require the buyer's email as a 2nd factor. The reference is
    // guessable up to ~1 in 16M (Date.now() + 4 hex) but the email
    // makes a successful probe ~1 in 7B+. Returning 404 on mismatch
    // prevents enumeration.
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!reference) {
      return res.status(400).json({ error: 'Payment reference is required' });
    }
    if (!email) {
      return res.status(400).json({ error: 'email query param is required' });
    }
    if (reference.length > 64 || email.length > 254) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    // Verify the order exists for (reference, email) BEFORE contacting
    // Paystack. This means a random probe never burns a Paystack API
    // call and never reveals timing differences.
    const probeResult = await query(
      `SELECT id, customer_email FROM orders
       WHERE reference = $1 AND LOWER(customer_email) = $2`,
      [reference, email]
    );
    if (probeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify payment with Paystack
    const verificationResponse = await paystack.transaction.verify(reference);

    if (!verificationResponse.status) {
      return res.status(400).json({
        error: 'Payment verification failed',
        details: verificationResponse.message
      });
    }

    const paymentData = verificationResponse.data;

    // Update order status based on payment verification
    let orderStatus = 'Pending';

    if (paymentData.status === 'success') {
      orderStatus = 'Paid';
    } else if (paymentData.status === 'failed') {
      orderStatus = 'Pending'; // Keep as pending for failed payments
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Fetch the order and lock it
      const existingOrderResult = await client.query(
        `SELECT * FROM orders WHERE reference = $1 FOR UPDATE`,
        [reference]
      );

      if (existingOrderResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Order not found' });
      }

      const existingOrder = existingOrderResult.rows[0];

      // If the order has already been successfully verified or successfully marked failed, skip reprocessing
      if (existingOrder.status === 'Paid' || existingOrder.status === 'Failed') {
        await client.query('ROLLBACK');
        return res.json({
          success: existingOrder.status === 'Paid',
          order: {
            id: existingOrder.id,
            reference: existingOrder.reference,
            status: existingOrder.status,
            totalAmount: parseFloat(existingOrder.total_amount),
            customerEmail: existingOrder.customer_email,
            paymentVerifiedAt: existingOrder.payment_verified_at
          },
          payment: {
            status: paymentData.status,
            amount: paymentData.amount / 100,
            currency: paymentData.currency,
            paidAt: paymentData.paid_at,
            reference: paymentData.reference
          },
          message: `Payment verification already processed as ${existingOrder.status}`
        });
      }

      if (paymentData.status === 'failed') {
        orderStatus = 'Failed'; // Mark failed permanently to drop the checkout hold
      }

      // Update order status
      const orderResult = await client.query(
        `UPDATE orders 
         SET status = $1,
             payment_reference = $2,
             payment_verified_at = NOW()
         WHERE reference = $3
         RETURNING *`,
        [orderStatus, reference, reference]
      );

      if (orderResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orderResult.rows[0];

      // If payment successful, send confirmation email
      if (paymentData.status === 'success') {
        const itemsResult = await client.query(
          `SELECT oi.*, p.name 
           FROM order_items oi
           JOIN product_variants pv ON oi.product_variant_id = pv.id
           JOIN products p ON pv.product_id = p.id
           WHERE oi.order_id = $1`,
          [order.id]
        );
        
        const emailOrder = {
          ...order,
          totalAmount: parseFloat(order.total_amount),
          items: itemsResult.rows.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: parseFloat(item.unit_price)
          }))
        };

        try {
          await sendOrderConfirmationEmail(order.customer_email, emailOrder, order.customer_name);
        } catch (emailErr) {
          console.error('Failed to send order confirmation email:', emailErr);
        }
      }

      // If payment failed, restore stock
      if (paymentData.status === 'failed') {
        // Get order items
        const itemsResult = await client.query(
          `SELECT oi.product_variant_id, oi.quantity
           FROM order_items oi
           WHERE oi.order_id = $1`,
          [order.id]
        );

        // Restore stock for each item
        for (const item of itemsResult.rows) {
          await client.query(
            `UPDATE product_variants 
             SET stock_quantity = stock_quantity + $1
             WHERE id = $2`,
            [item.quantity, item.product_variant_id]
          );
        }
      }

      await client.query('COMMIT');

      res.json({
        success: paymentData.status === 'success',
        order: {
          id: order.id,
          reference: order.reference,
          status: order.status,
          totalAmount: parseFloat(order.total_amount),
          customerEmail: order.customer_email,
          paymentVerifiedAt: order.payment_verified_at
        },
        payment: {
          status: paymentData.status,
          amount: paymentData.amount / 100, // Convert from kobo
          currency: paymentData.currency,
          paidAt: paymentData.paid_at,
          reference: paymentData.reference
        },
        message: `Payment verification ${paymentData.status === 'success' ? 'successful' : 'failed'}`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const orderResult = await query(
      `SELECT * FROM orders WHERE id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Get order items with product details
    const itemsResult = await query(
      `SELECT 
        oi.*,
        pv.name as variant_name,
        pv.price as variant_price,
        p.name as product_name,
        p.images as product_images
       FROM order_items oi
       JOIN product_variants pv ON oi.product_variant_id = pv.id
       JOIN products p ON pv.product_id = p.id
       WHERE oi.order_id = $1`,
      [id]
    );

    const items = itemsResult.rows.map(item => ({
      id: item.id,
      variantId: item.product_variant_id,
      variantName: item.variant_name,
      productName: item.product_name,
      productImages: item.product_images,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unit_price),
      totalPrice: parseFloat(item.total_price)
    }));

    res.json({
      order: {
        id: order.id,
        reference: order.reference,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        shippingAddress: order.shipping_address,
        totalAmount: parseFloat(order.total_amount),
        status: order.status,
        paymentReference: order.payment_reference,
        paymentVerifiedAt: order.payment_verified_at,
        createdAt: order.created_at
      },
      items
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

export const getOrders = async (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `SELECT * FROM orders`;
    let countSql = `SELECT COUNT(*) as total FROM orders`;
    const params = [];
    const countParams = [];
    let whereClauses = [];

    if (status) {
      whereClauses.push(`status = $${params.length + 1}`);
      params.push(status);
      countParams.push(status);
    }

    if (startDate) {
      whereClauses.push(`created_at >= $${params.length + 1}`);
      params.push(startDate);
      countParams.push(startDate);
    }

    if (endDate) {
      whereClauses.push(`created_at <= $${params.length + 1}`);
      params.push(endDate);
      countParams.push(endDate);
    }

    if (whereClauses.length > 0) {
      const whereClause = `WHERE ${whereClauses.join(' AND ')}`;
      sql += ` ${whereClause}`;
      countSql += ` ${whereClause}`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    // Get total count
    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0].total);

    // Get orders
    const ordersResult = await query(sql, params);

    const orders = ordersResult.rows.map(order => ({
      id: order.id,
      reference: order.reference,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      totalAmount: parseFloat(order.total_amount),
      status: order.status,
      createdAt: order.created_at
    }));

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['Pending', 'Paid', 'Shipped', 'Cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required (Pending, Paid, Shipped, or Cancelled)' });
    }

    const result = await query(
      `UPDATE orders 
       SET status = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = result.rows[0];

    // If status changed to Shipped, send email
    if (status === 'Shipped' && order.customer_email) {
      try {
        await sendShippingUpdateEmail(order.customer_email, order, null, order.customer_name);
      } catch (emailErr) {
        console.error('Failed to send shipping update email:', emailErr);
      }
    }

    res.json({
      id: order.id,
      reference: order.reference,
      status: order.status,
      updatedAt: order.updated_at,
      message: `Order status updated to ${status}`
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

/**
 * [NEW] Bulk update status for many orders in a single request.
 * Body: { ids: number[], status: 'Pending' | 'Paid' | 'Shipped' | 'Cancelled' }
 */
export const bulkUpdateStatus = async (req, res) => {
  try {
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }
    if (!status || !['Pending', 'Paid', 'Shipped', 'Cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required (Pending, Paid, Shipped, or Cancelled)' });
    }

    // Cap the batch size to avoid runaway updates
    const limitedIds = ids.slice(0, 500);

    const result = await query(
      `UPDATE orders
       SET status = $1, updated_at = NOW()
       WHERE id = ANY($2::int[])
       RETURNING id, reference, status, customer_email`,
      [status, limitedIds]
    );

    // Fire-and-forget shipping emails for newly shipped orders
    if (status === 'Shipped') {
      for (const order of result.rows) {
        if (order.customer_email) {
          try {
            await sendShippingUpdateEmail(order.customer_email, order, null, order.customer_name);
          } catch (emailErr) {
            console.error(`Failed to send shipping email for order ${order.reference}:`, emailErr);
          }
        }
      }
    }

    res.json({
      message: `${result.rowCount} order(s) updated to ${status}`,
      updatedCount: result.rowCount,
      orders: result.rows.map((o) => ({
        id: o.id,
        reference: o.reference,
        status: o.status,
      })),
    });
  } catch (error) {
    console.error('Error bulk-updating order status:', error);
    res.status(500).json({ error: 'Failed to bulk-update order status' });
  }
};

// Paystack Webhook Handler
// ---------------------------------------------------------------------------
// trackOrder  (PUBLIC — guest checkout)
//
//   GET /api/orders/track?ref=BUBU-…&email=customer@example.com
//
//   Returns a sanitised view of the order. Requires BOTH the reference
//   AND the email used at checkout — a guess of one without the other
//   returns 404 (no enumeration). Rate-limited via the global
//   apiLimiter. Never returns internal IDs, customer_id, gift card
//   codes, or the raw payment reference.
// ---------------------------------------------------------------------------
export const trackOrder = async (req, res) => {
  try {
    const rawRef = String(req.query.ref || '').trim();
    const rawEmail = String(req.query.email || '').trim().toLowerCase();
    if (!rawRef || !rawEmail) {
      return res.status(400).json({ error: 'Both ref and email are required' });
    }
    if (rawRef.length > 64 || rawEmail.length > 254) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const orderResult = await query(
      `SELECT id, reference, status, customer_name, customer_email, customer_phone,
              shipping_address, total_amount, payment_verified_at, created_at
       FROM orders
       WHERE reference = $1 AND LOWER(customer_email) = $2`,
      [rawRef, rawEmail]
    );
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orderResult.rows[0];

    const itemsResult = await query(
      `SELECT oi.quantity, oi.unit_price, oi.total_price,
              pv.name AS variant_name, p.name AS product_name, p.images
       FROM order_items oi
       JOIN product_variants pv ON oi.product_variant_id = pv.id
       JOIN products p ON pv.product_id = p.id
       WHERE oi.order_id = $1`,
      [order.id]
    );

    res.json({
      order: {
        reference: order.reference,
        status: order.status,
        customerName: order.customer_name,
        shippingAddress: order.shipping_address,
        totalAmount: parseFloat(order.total_amount),
        paidAt: order.payment_verified_at,
        createdAt: order.created_at,
      },
      items: itemsResult.rows.map((it) => ({
        productName: it.product_name,
        variantName: it.variant_name,
        quantity: it.quantity,
        unitPrice: parseFloat(it.unit_price),
        totalPrice: parseFloat(it.total_price),
        images: it.images,
      })),
    });
  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({ error: 'Failed to track order' });
  }
};