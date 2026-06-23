import express from 'express';
import crypto from 'crypto';
import { getClient, query } from '../db.js';
import { sendOrderConfirmationEmail } from '../services/emailService.js';

const router = express.Router();
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

/**
 * Paystack webhook for Bubu Lagos orders.
 *
 * Body parsing: this route relies on `req.rawBody` (a Buffer) being
 * populated by the global `express.json` `verify` callback in index.js.
 * That callback must be in place BEFORE the app starts receiving traffic
 * or HMAC verification will fail.
 *
 * IDEMPOTENCY: Paystack may deliver the same `charge.success` event
 * more than once (network retries, manual replays). To prevent
 * double-processing (duplicate status flips, duplicate stock decrements,
 * duplicate confirmation emails) we enforce three layers of protection:
 *
 *   1. Pre-check by `payment_reference` - fastest, catches retries that
 *      happen after the first one has fully completed.
 *   2. Row-level `SELECT ... FOR UPDATE` lock during processing.
 *   3. Database UNIQUE constraint on `orders.payment_reference` (see
 *      migration 015_unique_payment_reference.sql).
 */
router.post('/paystack', async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];

    if (!signature) {
      console.warn('[bubu-webhook] Missing x-paystack-signature header');
      // 200 to stop Paystack from retrying on misconfiguration
      return res.status(200).send('Ignored');
    }

    if (!Buffer.isBuffer(req.rawBody)) {
      console.error(
        '[bubu-webhook] req.rawBody is not a Buffer. ' +
        'Check the express.json verify callback in src/index.js.'
      );
      return res.status(500).send('Server misconfigured');
    }

    // 1. Verify HMAC SHA-512 over the EXACT raw bytes Paystack sent.
    const expected = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(req.rawBody)
      .digest('hex');

    if (expected !== signature) {
      console.warn('[bubu-webhook] Invalid signature');
      return res.status(400).send('Invalid signature');
    }

    // 2. Parse AFTER verification.
    const event = JSON.parse(req.rawBody.toString('utf8'));

    // We only care about successful charges.
    if (event.event !== 'charge.success') {
      return res.status(200).send('Ignored');
    }

    const { reference, metadata } = event.data || {};
    if (!reference) {
      console.warn('[bubu-webhook] charge.success missing reference');
      return res.status(200).send('Ignored');
    }

    // 3. IDEMPOTENCY LAYER 1 - cheap pre-check on payment_reference.
    // If ANY order already has this reference recorded, the payment
    // was processed previously. Stop here to prevent double-charge
    // side effects (stock decrement, email, status flip).
    const dup = await query(
      `SELECT id, status FROM orders WHERE payment_reference = $1 LIMIT 1`,
      [reference]
    );

    if (dup.rows.length > 0) {
      const existing = dup.rows[0];
      console.log(
        `[bubu-webhook] Duplicate ref ${reference} on order ${existing.id} ` +
        `(status=${existing.status}). Returning 200 (idempotent).`
      );
      return res.status(200).json({
        status: 'duplicate',
        orderId: existing.id,
        orderStatus: existing.status,
      });
    }

    // 4. Find the order. The reference Paystack echoes back is the
    //    `orders.reference` we passed during initialization.
    const orderLookup = await query(
      `SELECT * FROM orders WHERE reference = $1 LIMIT 1`,
      [reference]
    );

    let order = orderLookup.rows[0];

    // Fallback: use metadata.orderId if provided
    if (!order && metadata && metadata.orderId) {
      const byId = await query(
        `SELECT * FROM orders WHERE id = $1 LIMIT 1`,
        [metadata.orderId]
      );
      order = byId.rows[0];
    }

    if (!order) {
      // We log loudly but return 200 to stop Paystack from retrying
      // forever on a reference that will never match (e.g. test event).
      console.warn(`[bubu-webhook] No order matches ref=${reference}`);
      return res.status(200).send('No matching order');
    }

    // 5. Process the payment (row-locked, idempotent at the row level).
    const result = await processOrderPayment(order, event.data);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('[bubu-webhook] Error:', error);
    // 500 so Paystack retries on transient failures (DB down, etc.)
    res.status(500).send('Internal error');
  }
});

/**
 * Mark an order Paid atomically. Idempotent at the row level via
 * `SELECT ... FOR UPDATE` and a status guard. Returns the HTTP
 * status + JSON body the route handler should send back.
 */
async function processOrderPayment(order, paymentData) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Lock the row so concurrent webhooks serialize.
    const lockedResult = await client.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [order.id]
    );

    if (lockedResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { status: 404, body: { error: 'Order not found' } };
    }

    const locked = lockedResult.rows[0];

    // IDEMPOTENCY LAYER 2 - row-level guard. If another webhook
    // already flipped this order to a terminal status, no-op.
    if (locked.status === 'Paid' || locked.status === 'Failed') {
      await client.query('ROLLBACK');
      console.log(
        `[bubu-webhook] Order ${order.id} already in terminal status ` +
        `${locked.status}. Skipping.`
      );
      return {
        status: 200,
        body: { status: 'already_processed', orderStatus: locked.status },
      };
    }

    // Mark Paid + record payment_reference (UNIQUE constraint enforces
    // no two orders can share a reference, even under race conditions).
    const updateResult = await client.query(
      `UPDATE orders
       SET status = 'Paid',
           payment_reference = $1,
           payment_verified_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [paymentData.reference, order.id]
    );

    const updated = updateResult.rows[0];

    // Load items for the confirmation email.
    const itemsResult = await client.query(
      `SELECT oi.*, p.name
       FROM order_items oi
       JOIN product_variants pv ON oi.product_variant_id = pv.id
       JOIN products p ON pv.product_id = p.id
       WHERE oi.order_id = $1`,
      [order.id]
    );

    const emailOrder = {
      ...updated,
      totalAmount: parseFloat(updated.total_amount),
      items: itemsResult.rows.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: parseFloat(i.unit_price),
      })),
    };

    // Email is best-effort: a failure here MUST NOT roll back the
    // payment status flip. The customer has paid; the worst case is
    // a delayed confirmation email which can be re-sent from admin.
    try {
      await sendOrderConfirmationEmail(
        updated.customer_email,
        emailOrder,
        updated.customer_name
      );
    } catch (emailErr) {
      console.error('[bubu-webhook] Confirmation email failed:', emailErr);
    }

    await client.query('COMMIT');

    console.log(
      `[bubu-webhook] Order ${order.id} marked Paid for reference ${paymentData.reference}`
    );
    return {
      status: 200,
      body: { status: 'processed', orderId: order.id },
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export default router;
