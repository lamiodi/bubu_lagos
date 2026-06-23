import bcrypt from 'bcrypt';
import { query } from '../db.js';
import { generateAdminToken } from '../middleware/authMiddleware.js';

// Lockout policy. After 5 wrong passwords the account is locked for
// 15 minutes. Both values are read at boot so they can be tuned via
// env if needed.
const MAX_FAILED_LOGINS = parseInt(process.env.ADMIN_MAX_FAILED_LOGINS, 10) || 5;
const LOCKOUT_MS = (parseInt(process.env.ADMIN_LOCKOUT_MINUTES, 10) || 15) * 60 * 1000;

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await query(
      `SELECT id, email, username, password_hash, is_active,
              failed_login_count, locked_until
       FROM admin_users WHERE email = $1 AND is_active = true`,
      [email]
    );

    if (result.rows.length === 0) {
      // Don't leak whether the email exists. Same response shape as
      // a wrong password, same timing budget (~bcrypt.compare).
      await bcrypt.compare(password, '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const adminUser = result.rows[0];
    const now = new Date();

    // Lockout check. If locked_until is in the future, refuse. We DO
    // NOT reset the counter here — the timer has to run out from the
    // time of the last failure, not from a probing request.
    if (adminUser.locked_until && new Date(adminUser.locked_until) > now) {
      return res.status(429).json({
        error: 'Account temporarily locked. Try again later.',
        retryAfterSeconds: Math.ceil((new Date(adminUser.locked_until) - now) / 1000),
      });
    }

    const isValidPassword = await bcrypt.compare(password, adminUser.password_hash);

    if (!isValidPassword) {
      // Atomically increment the failure counter and (if this is the
      // threshold-th failure) set locked_until. RETURNING gives us
      // the post-update counter without a second roundtrip.
      const updated = await query(
        `UPDATE admin_users
         SET failed_login_count = COALESCE(failed_login_count, 0) + 1,
             locked_until = CASE
               WHEN COALESCE(failed_login_count, 0) + 1 >= $2
                 THEN NOW() + ($3::int * INTERVAL '1 millisecond')
               ELSE NULL
             END
         WHERE id = $1
         RETURNING failed_login_count, locked_until`,
        [adminUser.id, MAX_FAILED_LOGINS, LOCKOUT_MS]
      );
      const row = updated.rows[0];
      if (row && row.locked_until) {
        return res.status(429).json({
          error: 'Account temporarily locked. Try again later.',
          retryAfterSeconds: Math.ceil((new Date(row.locked_until) - now) / 1000),
        });
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Success: reset the counter and clear any past lock, then issue
    // the token. last_login is updated in the same query.
    await query(
      `UPDATE admin_users
       SET failed_login_count = 0,
           locked_until = NULL,
           last_login = NOW()
       WHERE id = $1`,
      [adminUser.id]
    );

    const token = generateAdminToken(adminUser.id);

    res.json({
      token,
      adminUser: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        isActive: adminUser.is_active,
        createdAt: adminUser.created_at,
        lastLogin: new Date().toISOString(),
      },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

/**
 * [NEW] Returns the currently authenticated admin user.
 * Frontend's AdminRoute probes this on mount to validate the session.
 */
export const getMe = async (req, res) => {
  try {
    const id = req.admin?.id;
    if (!id) return res.status(401).json({ error: 'Not authenticated' });
    const result = await query(
      `SELECT id, username, email, is_active, created_at, last_login
       FROM admin_users WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Admin not found' });
    const u = result.rows[0];
    res.json({
      adminUser: {
        id: u.id,
        username: u.username,
        email: u.email,
        isActive: u.is_active,
        createdAt: u.created_at,
        lastLogin: u.last_login,
      },
    });
  } catch (error) {
    console.error('Error in getMe:', error);
    res.status(500).json({ error: 'Failed to load admin profile' });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    // [NEW] Honor ?days= for the date-range picker (defaults to 30, max 365).
    const days = Math.max(1, Math.min(365, parseInt(req.query.days, 10) || 30));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const startOfPeriod = new Date(today);
    startOfPeriod.setDate(startOfPeriod.getDate() - days);

    const [
      totalOrdersResult,
      totalRevenueResult,
      todayOrdersResult,
      todayRevenueResult,
      yesterdayOrdersResult,
      yesterdayRevenueResult,
      pendingOrdersResult,
      totalProductsResult,
      lowStockResult,
      totalCategoriesResult,
      monthlyRevenueResult,
      dailyRevenueResult,
    ] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM orders`),
      query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'Paid'`),
      query(`SELECT COUNT(*) as count FROM orders WHERE created_at >= $1 AND created_at < $2`, [today, tomorrow]),
      query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'Paid' AND created_at >= $1 AND created_at < $2`, [today, tomorrow]),
      query(`SELECT COUNT(*) as count FROM orders WHERE created_at >= $1 AND created_at < $2`, [yesterday, today]),
      query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'Paid' AND created_at >= $1 AND created_at < $2`, [yesterday, today]),
      query(`SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'`),
      query(`SELECT COUNT(*) as count FROM products`),
      query(`SELECT COUNT(*) as count FROM product_variants WHERE stock_quantity < 10`),
      query(`SELECT COUNT(*) as count FROM categories`),
      query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'Paid' AND created_at >= $1`, [startOfMonth]),
      // [NEW] Daily revenue series for the chart.
      query(
        `SELECT
            DATE(created_at) AS day,
            COALESCE(SUM(total_amount), 0) AS revenue,
            COUNT(*) AS orders
         FROM orders
         WHERE status = 'Paid' AND created_at >= $1 AND created_at < $2
         GROUP BY DATE(created_at)
         ORDER BY day ASC`,
        [startOfPeriod, tomorrow]
      ),
    ]);

    const todayOrders = parseInt(todayOrdersResult.rows[0].count);
    const yesterdayOrders = parseInt(yesterdayOrdersResult.rows[0].count);
    const todayRevenue = parseFloat(todayRevenueResult.rows[0].total);
    const yesterdayRevenue = parseFloat(yesterdayRevenueResult.rows[0].total);

    const orderChange = yesterdayOrders > 0
      ? ((todayOrders - yesterdayOrders) / yesterdayOrders * 100).toFixed(1)
      : todayOrders > 0 ? 100 : 0;

    const revenueChange = yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1)
      : todayRevenue > 0 ? 100 : 0;

    const recentOrdersResult = await query(
      `SELECT id, reference, customer_name, total_amount, status, created_at
       FROM orders
       ORDER BY created_at DESC
       LIMIT 5`
    );
    const recentOrders = recentOrdersResult.rows.map((o) => ({
      id: o.id, reference: o.reference, customerName: o.customer_name,
      totalAmount: parseFloat(o.total_amount), status: o.status, createdAt: o.created_at,
    }));

    const lowStockProductsResult = await query(
      `SELECT pv.id as variant_id, pv.name as variant_name, pv.stock_quantity,
              p.name as product_name, p.id as product_id
       FROM product_variants pv
       JOIN products p ON pv.product_id = p.id
       WHERE pv.stock_quantity < 10
       ORDER BY pv.stock_quantity ASC
       LIMIT 10`
    );
    const lowStockProducts = lowStockProductsResult.rows.map((item) => ({
      variantId: item.variant_id, variantName: item.variant_name,
      productId: item.product_id, productName: item.product_name,
      stockQuantity: item.stock_quantity,
    }));

    // [NEW] Continuous series with zero-fill for days with no orders.
    const dailyRevenueMap = new Map(
      dailyRevenueResult.rows.map((r) => [
        new Date(r.day).toISOString().slice(0, 10),
        { revenue: parseFloat(r.revenue), orders: parseInt(r.orders) },
      ])
    );
    const dailyRevenue = [];
    const cursor = new Date(startOfPeriod);
    while (cursor < tomorrow) {
      const key = cursor.toISOString().slice(0, 10);
      const data = dailyRevenueMap.get(key) || { revenue: 0, orders: 0 };
      dailyRevenue.push({
        name: cursor.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }),
        date: key,
        revenue: data.revenue,
        orders: data.orders,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    res.json({
      stats: {
        totalOrders: parseInt(totalOrdersResult.rows[0].count),
        totalRevenue: parseFloat(totalRevenueResult.rows[0].total),
        todayOrders,
        todayRevenue,
        yesterdayOrders,
        yesterdayRevenue,
        orderChange: parseFloat(orderChange),
        revenueChange: parseFloat(revenueChange),
        pendingOrders: parseInt(pendingOrdersResult.rows[0].count),
        totalProducts: parseInt(totalProductsResult.rows[0].count),
        lowStockVariants: parseInt(lowStockResult.rows[0].count),
        totalCategories: parseInt(totalCategoriesResult.rows[0].count),
        monthlyRevenue: parseFloat(monthlyRevenueResult.rows[0].total),
      },
      recentOrders,
      lowStockProducts,
      dailyRevenue,
      range: { days, from: startOfPeriod, to: tomorrow },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

export const getAdminUsers = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, username, email, is_active, created_at, last_login
       FROM admin_users ORDER BY created_at DESC`
    );
    const adminUsers = result.rows.map((u) => ({
      id: u.id, username: u.username, email: u.email,
      isActive: u.is_active, createdAt: u.created_at, lastLogin: u.last_login,
    }));
    res.json({ adminUsers });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
};

export const createAdminUser = async (req, res) => {
  try {
    const { username, email, password, isActive = true } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    const existing = await query(`SELECT id FROM admin_users WHERE email = $1`, [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Admin user with this email already exists' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO admin_users (username, email, password_hash, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, is_active, created_at`,
      [username, email, passwordHash, isActive]
    );
    const u = result.rows[0];
    res.status(201).json({
      message: 'Admin user created successfully',
      adminUser: { id: u.id, username: u.username, email: u.email, isActive: u.is_active, createdAt: u.created_at },
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    if (error.code === '23505') return res.status(409).json({ error: 'Admin user with this email or username already exists' });
    res.status(500).json({ error: 'Failed to create admin user' });
  }
};

export const updateAdminUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password, isActive } = req.body;
    const userResult = await query(`SELECT id FROM admin_users WHERE id = $1`, [id]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'Admin user not found' });

    const updates = [];
    const params = [];
    let i = 1;
    if (username !== undefined) { updates.push(`username = $${i++}`); params.push(username); }
    if (email !== undefined) { updates.push(`email = $${i++}`); params.push(email); }
    if (password !== undefined) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${i++}`); params.push(passwordHash);
    }
    if (isActive !== undefined) { updates.push(`is_active = $${i++}`); params.push(isActive); }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query(
      `UPDATE admin_users SET ${updates.join(', ')} WHERE id = $${i}
       RETURNING id, username, email, is_active, created_at, updated_at`,
      params
    );
    const u = result.rows[0];
    res.json({
      message: 'Admin user updated successfully',
      adminUser: { id: u.id, username: u.username, email: u.email, isActive: u.is_active, createdAt: u.created_at, updatedAt: u.updated_at },
    });
  } catch (error) {
    console.error('Error updating admin user:', error);
    if (error.code === '23505') return res.status(409).json({ error: 'Email or username already exists' });
    res.status(500).json({ error: 'Failed to update admin user' });
  }
};

export const deleteAdminUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.adminUser?.id === Number(id)) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const adminCountResult = await query(`SELECT COUNT(*) as count FROM admin_users WHERE is_active = true`);
    const activeAdminCount = parseInt(adminCountResult.rows[0].count);
    const userResult = await query(`SELECT is_active FROM admin_users WHERE id = $1`, [id]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'Admin user not found' });
    const isUserActive = userResult.rows[0].is_active;
    if (isUserActive && activeAdminCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last active admin user' });
    }
    const result = await query(`DELETE FROM admin_users WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Admin user not found' });
    res.json({ message: 'Admin user deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin user:', error);
    res.status(500).json({ error: 'Failed to delete admin user' });
  }
};
