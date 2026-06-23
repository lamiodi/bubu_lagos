import { query, getClient } from '../db.js';
import crypto from 'crypto';

/**
 * Helper: Hashes a code for secure storage
 */
const getHash = (code) => {
  return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
};

/**
 * Helper: Masks a code for display
 */
const maskCode = (code) => {
  return `****-****-****-${code.slice(-4)}`;
};

/**
 * Generates a unique 16-character alphanumeric gift card code
 */
const generateRawCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Creates a new gift card (Admin function)
 */
export const createGiftCard = async (req, res) => {
  const { amount, expiryMonths = 12, customerId = null } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid balance amount is required' });
  }

  try {
    let rawCode;
    let codeHash;
    let isUnique = false;
    
    // Check for collisions (on the hash)
    while (!isUnique) {
      rawCode = generateRawCode();
      codeHash = getHash(rawCode);
      const existing = await query('SELECT id FROM gift_cards WHERE code_hash = $1', [codeHash]);
      if (existing.rows.length === 0) isUnique = true;
    }

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);

    const result = await query(
      `INSERT INTO gift_cards (code_hash, code_masked, original_balance, current_balance, expiry_date, customer_id, status)
       VALUES ($1, $2, $3, $3, $4, $5, 'Active')
       RETURNING *`,
      [codeHash, maskCode(rawCode), amount, expiryDate, customerId]
    );

    const giftCard = result.rows[0];

    // Log creation
    await query(
      `INSERT INTO gift_card_logs (gift_card_id, amount_used, balance_before, balance_after, transaction_type)
       VALUES ($1, 0, 0, $2, 'Creation')`,
      [giftCard.id, amount]
    );

    res.status(201).json({
      message: 'Gift card created successfully',
      giftCard: {
        id: giftCard.id,
        code: rawCode, // SECURE: Sent only once in the response. Cannot be retrieved later.
        codeMasked: giftCard.code_masked,
        currentBalance: parseFloat(giftCard.current_balance),
        expiryDate: giftCard.expiry_date,
        status: giftCard.status
      }
    });

  } catch (error) {
    console.error('Error creating gift card:', error);
    res.status(500).json({ error: 'Failed to create gift card' });
  }
};

/**
 * Validates a gift card code
 */
export const validateGiftCard = async (req, res) => {
  const { code } = req.params;

  if (!code) {
    return res.status(400).json({ error: 'Gift card code is required' });
  }

  try {
    const codeHash = getHash(code);
    const result = await query(
      `SELECT * FROM gift_cards WHERE code_hash = $1`,
      [codeHash]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid gift card code' });
    }

    const card = result.rows[0];

    // Auto-expire
    if (new Date(card.expiry_date) < new Date() && card.status === 'Active') {
        await query("UPDATE gift_cards SET status = 'Expired' WHERE id = $1", [card.id]);
        return res.status(400).json({ error: 'Gift card has expired', status: 'Expired' });
    }

    if (card.status !== 'Active') {
      return res.status(400).json({ error: `Gift card is ${card.status.toLowerCase().replace('_', ' ')}`, status: card.status });
    }

    if (parseFloat(card.current_balance) <= 0) {
      return res.status(400).json({ error: 'Gift card balance is depleted', status: 'Fully_Redeemed' });
    }

    res.json({
      valid: true,
      giftCard: {
        codeMasked: card.code_masked,
        currentBalance: parseFloat(card.current_balance),
        expiryDate: card.expiry_date
      }
    });

  } catch (error) {
    console.error('Error validating gift card:', error);
    res.status(500).json({ error: 'Failed to validate gift card' });
  }
};

/**
 * Applies gift card to an order (Atomic logic)
 */
export const applyGiftCard = async (req, res) => {
  const { code, orderId, amountToUse } = req.body;

  if (!code || !amountToUse || amountToUse <= 0) {
    return res.status(400).json({ error: 'Code and amount to use are required' });
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    const codeHash = getHash(code);
    // Lock for update to prevent double spending
    const cardResult = await client.query(
      `SELECT * FROM gift_cards WHERE code_hash = $1 FOR UPDATE`,
      [codeHash]
    );

    if (cardResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Gift card not found' });
    }

    const card = cardResult.rows[0];

    if (card.status !== 'Active' || new Date(card.expiry_date) < new Date() || parseFloat(card.current_balance) <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Gift card is not valid or has no balance' });
    }

    const currentBalance = parseFloat(card.current_balance);
    const actualAmountToUse = Math.min(currentBalance, amountToUse);
    const newBalance = currentBalance - actualAmountToUse;
    const newStatus = newBalance === 0 ? 'Fully_Redeemed' : 'Active';

    await client.query(
      `UPDATE gift_cards SET current_balance = $1, status = $2, updated_at = NOW() WHERE id = $3`,
      [newBalance, newStatus, card.id]
    );

    await client.query(
      `INSERT INTO gift_card_logs (gift_card_id, order_id, amount_used, balance_before, balance_after, transaction_type)
       VALUES ($1, $2, $3, $4, $5, 'Redemption')`,
      [card.id, orderId || null, actualAmountToUse, currentBalance, newBalance]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      amountUsed: actualAmountToUse,
      remainingBalance: newBalance,
      status: newStatus
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error applying gift card:', error);
    res.status(500).json({ error: 'Failed to apply gift card' });
  } finally {
    client.release();
  }
};

/**
 * [NEW] Public purchase flow for gift cards.
 * Validates recipient info, generates a new code, persists it, and (best-effort)
 * emails the code to the recipient. Returns the raw code only once.
 *
 * Body: { amount, recipientEmail, recipientPhone, recipientName?, senderName?, message? }
 */
export const purchaseGiftCard = async (req, res) => {
  const {
    amount,
    recipientEmail,
    recipientPhone,
    recipientName,
    senderName,
    message,
  } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid amount is required' });
  }
  if (!recipientEmail) {
    return res.status(400).json({ error: 'Recipient email is required' });
  }
  if (!recipientPhone) {
    return res.status(400).json({ error: 'Recipient phone number is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail)) {
    return res.status(400).json({ error: 'Invalid recipient email' });
  }
  if (!/^\d{11}$/.test(String(recipientPhone).replace(/\D/g, ''))) {
    return res.status(400).json({ error: 'Recipient phone must be an 11-digit Nigerian number' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    let rawCode;
    let codeHash;
    let isUnique = false;
    while (!isUnique) {
      rawCode = generateRawCode();
      codeHash = getHash(rawCode);
      const existing = await client.query('SELECT id FROM gift_cards WHERE code_hash = $1', [codeHash]);
      if (existing.rows.length === 0) isUnique = true;
    }

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 12);

    const insertResult = await client.query(
      `INSERT INTO gift_cards (
         code_hash, code_masked, original_balance, current_balance,
         expiry_date, status, recipient_email, recipient_phone,
         recipient_name, sender_name, personal_message
       )
       VALUES ($1, $2, $3, $3, $4, 'Active', $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        codeHash,
        maskCode(rawCode),
        amount,
        expiryDate,
        recipientEmail.toLowerCase(),
        recipientPhone,
        recipientName || null,
        senderName || null,
        message || null,
      ]
    );

    const giftCard = insertResult.rows[0];

    await client.query(
      `INSERT INTO gift_card_logs (gift_card_id, amount_used, balance_before, balance_after, transaction_type)
       VALUES ($1, 0, 0, $2, 'Creation')`,
      [giftCard.id, amount]
    );

    await client.query('COMMIT');

    // Best-effort: email the code to the recipient.
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fmtAmount = new Intl.NumberFormat('en-NG').format(amount);
      const senderLine = senderName ? `from ${senderName}` : '';
      const messageHtml = message
        ? `<blockquote style="margin:12px 0;padding:12px 16px;border-left:3px solid #d4af37;background:#faf8f3;">${message}</blockquote>`
        : '';
      await resend.emails.send({
        from: 'Bubu Lagos <noreply@bubulagos.com>',
        to: [recipientEmail],
        subject: `You've received a Bubu Lagos Gift Card${senderName ? ' ' + senderLine : ''}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <h1 style="color:#111;margin:0 0 16px;">You've received a gift card</h1>
            <p>${senderName ? `<strong>${senderName}</strong> has gifted you ` : 'You have '}a Bubu Lagos gift card worth <strong>₦${fmtAmount}</strong>.</p>
            ${messageHtml}
            <div style="margin:24px 0;padding:24px;border:1px dashed #d4af37;border-radius:8px;text-align:center;">
              <p style="margin:0 0 8px;color:#666;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;">Your code</p>
              <p style="margin:0;font-size:24px;font-weight:700;letter-spacing:0.15em;color:#111;">${rawCode}</p>
            </div>
            <p style="color:#666;font-size:14px;">Redeem at checkout on <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">bubu lagos</a>. This code is valid for 12 months.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Failed to email gift card code:', emailErr);
      // Don't fail the request — the code is still returned once below.
    }

    res.status(201).json({
      message: 'Gift card purchased successfully',
      giftCard: {
        id: giftCard.id,
        code: rawCode, // Sent only once
        codeMasked: giftCard.code_masked,
        currentBalance: parseFloat(giftCard.current_balance),
        expiryDate: giftCard.expiry_date,
        recipientEmail: giftCard.recipient_email,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error purchasing gift card:', error);
    res.status(500).json({ error: 'Failed to purchase gift card' });
  } finally {
    client.release();
  }
};

/**
 * Lists gift cards (Admin)
 */
export const getGiftCards = async (req, res) => {
  try {
    const result = await query(`
      SELECT gc.id, gc.code_masked, gc.original_balance, gc.current_balance, gc.expiry_date, gc.status, gc.created_at, c.email as customer_email 
      FROM gift_cards gc 
      LEFT JOIN customers c ON gc.customer_id = c.id 
      ORDER BY gc.created_at DESC
    `);
    
    res.json(result.rows.map(card => ({
      ...card,
      original_balance: parseFloat(card.original_balance),
      current_balance: parseFloat(card.current_balance)
    })));
  } catch (error) {
    console.error('Error fetching gift cards:', error);
    res.status(500).json({ error: 'Failed to fetch gift cards' });
  }
};

/**
 * Gets logs for a gift card
 */
export const getGiftCardLogs = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query(
            `SELECT l.*, o.reference as order_reference 
             FROM gift_card_logs l 
             LEFT JOIN orders o ON l.order_id = o.id 
             WHERE l.gift_card_id = $1 
             ORDER BY l.created_at DESC`,
            [id]
        );
        res.json(result.rows.map(row => ({
            ...row,
            amount_used: parseFloat(row.amount_used),
            balance_before: parseFloat(row.balance_before),
            balance_after: parseFloat(row.balance_after)
        })));
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
};
