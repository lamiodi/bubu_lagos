// ===========================================================================
// customerController.js — guest-checkout edition
//
// The store is now guest-only. There is no register, login, profile,
// password, address book, or password reset. The customers table is
// nothing more than a contact list used for analytics and the admin
// dashboard.
//
// This file intentionally exposes only the admin-side operations:
//   * getAllCustomers        — paginated contact list
//   * getCustomerById        — single contact + their recent orders
//   * toggleCustomerStatus   — block/unblock a contact
//
// All other customer-facing logic (name/email/phone capture, upsert)
// happens inside orderController.createOrder, which is the single
// source of truth for guest checkout.
// ===========================================================================

import { query } from '../db.js';

// ---------------------------------------------------------------------------
// getAllCustomers
//   GET /api/customers/admin/all?page=1&limit=20&search=foo
//   Auth: admin only. Returns the contact list with order_count and
//   total_spent rollups.
// ---------------------------------------------------------------------------
export const getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;
    const safeLimit = Math.min(parseInt(limit, 10) || 20, 100);

    const params = [];
    const countParams = [];
    let where = '';

    if (search && String(search).trim().length > 0) {
      // Escape the three characters that have special meaning in a
      // SQL LIKE pattern (% wildcard, _ single-char wildcard, and the
      // escape character itself). Without this, a user typing
      // "100%" in the search box would match every row, and a user
      // typing "a_b" would match any 3-character string with 'a'
      // and 'b' in the middle. The ESCAPE clause below tells PG to
      // treat the backslash as the escape char.
      const raw = String(search).toLowerCase().trim();
      const safe = raw
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
      where = ` WHERE LOWER(email) LIKE $1 ESCAPE '\\'
                 OR LOWER(COALESCE(first_name, '')) LIKE $1 ESCAPE '\\'
                 OR LOWER(COALESCE(last_name, '')) LIKE $1 ESCAPE '\\'
                 OR COALESCE(phone, '') LIKE $1 ESCAPE '\\'`;
      params.push(`%${safe}%`);
      countParams.push(params[0]);
    }

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM customers${where}`,
      countParams
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Note: orders.customer_id was dropped in migration 017 because
    // guest-checkout orders don't have a stable FK. We aggregate
    // against orders on the lowercased email instead, which is
    // denormalised onto the order at checkout.
    params.push(safeLimit, offset);
    const sql = `
      SELECT c.id, c.email, c.first_name, c.last_name, c.phone,
             c.is_guest, c.created_at,
             COUNT(o.id) AS order_count,
             COALESCE(SUM(o.total_amount), 0) AS total_spent
      FROM customers c
      LEFT JOIN orders o ON LOWER(o.customer_email) = LOWER(c.email)
      ${where}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const result = await query(sql, params);

    res.json({
      customers: result.rows.map((row) => ({
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        phone: row.phone,
        isGuest: row.is_guest,
        createdAt: row.created_at,
        orderCount: parseInt(row.order_count, 10),
        totalSpent: parseFloat(row.total_spent),
      })),
      pagination: {
        page: parseInt(page, 10),
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    console.error('Get all customers error:', error);
    res.status(500).json({ error: 'Failed to get customers' });
  }
};

// ---------------------------------------------------------------------------
// getCustomerById
//   GET /api/customers/admin/:id
//   Auth: admin only. Returns a contact + their last 20 orders (already
//   contains all the info we used to put in /profile).
// ---------------------------------------------------------------------------
export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customerResult = await query(
      `SELECT id, email, first_name, last_name, phone, is_guest, created_at
       FROM customers WHERE id = $1`,
      [id]
    );
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const c = customerResult.rows[0];

    const ordersResult = await query(
      `SELECT id, reference, total_amount, status, created_at
       FROM orders WHERE LOWER(customer_email) = LOWER($1)
       ORDER BY created_at DESC LIMIT 20`,
      [c.email]
    );

    res.json({
      customer: {
        id: c.id,
        email: c.email,
        firstName: c.first_name,
        lastName: c.last_name,
        phone: c.phone,
        isGuest: c.is_guest,
        createdAt: c.created_at,
      },
      orders: ordersResult.rows.map((row) => ({
        id: row.id,
        reference: row.reference,
        totalAmount: parseFloat(row.total_amount),
        status: row.status,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error('Get customer by id error:', error);
    res.status(500).json({ error: 'Failed to get customer' });
  }
};

// ---------------------------------------------------------------------------
// toggleCustomerStatus
//   PUT /api/customers/admin/:id/status
//   Auth: admin only. Flips is_guest between TRUE/FALSE on a contact
//   (used to soft-block a contact that misbehaves).
// ---------------------------------------------------------------------------
export const toggleCustomerStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE customers
       SET is_guest = NOT COALESCE(is_guest, true), updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, is_guest`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({
      id: result.rows[0].id,
      email: result.rows[0].email,
      isGuest: result.rows[0].is_guest,
      message: `Customer ${result.rows[0].is_guest ? 'unblocked' : 'blocked'} successfully`,
    });
  } catch (error) {
    console.error('Toggle customer status error:', error);
    res.status(500).json({ error: 'Failed to update customer status' });
  }
};
