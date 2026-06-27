import bcrypt from 'bcrypt';
import { query } from '../db.js';
import { generateAdminToken } from '../middleware/authMiddleware.js';

// Lockout policy. After 5 wrong passwords the account is locked for
// 15 minutes. Both values are read at boot so they can be tuned via
// env if needed.
const MAX_FAILED_LOGINS = parseInt(process.env.ADMIN_MAX_FAILED_LOGINS, 10) || 5;
const LOCKOUT_MS = (parseInt(process.env.ADMIN_LOCKOUT_MINUTES, 10) || 15) * 60 * 1000;

// The admin_users table may live in the `bubu` schema (shared WodiFair
// install) or `public` (standalone). Some columns (username, is_active,
// etc.) were added by later migrations that are SKIPPED when the shared
// schema is present. We detect the actual schema once at boot so all
// queries can be built dynamically.
let _adminSchema = null;   // 'bubu' or 'public'
let _adminHasUsername = false;
let _adminHasIsActive = false;
let _adminHasFailedLoginCount = false;
let _adminHasLockedUntil = false;
let _adminHasLastLogin = false;
let _adminColumnsReady = false;

async function ensureAdminColumns() {
  if (_adminColumnsReady) return;
  // Find which schema the admin_users table is in
  const schemaRes = await query(
    `SELECT table_schema FROM information_schema.tables
     WHERE table_name = 'admin_users'
       AND table_schema IN ('bubu', 'public')
     LIMIT 1`
  );
  if (schemaRes.rows.length === 0) {
    // Table doesn't exist at all — fall back to public
    _adminSchema = 'public';
  } else {
    _adminSchema = schemaRes.rows[0].table_schema;
  }
  const schema = _adminSchema;
  // Check each optional column
  const colCheck = async (col) => {
    const r = await query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'admin_users' AND column_name = $2`,
      [schema, col]
    );
    return r.rows.length > 0;
  };
  _adminHasUsername       = await colCheck('username');
  _adminHasIsActive       = await colCheck('is_active');
  _adminHasFailedLoginCount = await colCheck('failed_login_count');
  _adminHasLockedUntil    = await colCheck('locked_until');
  _adminHasLastLogin      = await colCheck('last_login');
  _adminColumnsReady = true;
}

export const adminLogin = async (req, res) => {
  try {
    await ensureAdminColumns();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Build SELECT dynamically based on which columns exist
    const selectCols = ['id', 'email', 'password_hash'];
    if (_adminHasUsername) selectCols.push('username');
    else selectCols.push(`email AS username`);
    if (_adminHasIsActive) selectCols.push('is_active');
    else selectCols.push(`true AS is_active`);
    if (_adminHasFailedLoginCount) selectCols.push('failed_login_count');
    if (_adminHasLockedUntil) selectCols.push('locked_until');

    const whereClause = _adminHasIsActive
      ? 'is_active = true'
      : 'true = true';

    const result = await query(
      `SELECT ${selectCols.join(', ')}
       FROM admin_users WHERE email = $1 AND ${whereClause}`,
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
    if (_adminHasLockedUntil && adminUser.locked_until && new Date(adminUser.locked_until) > now) {
      return res.status(429).json({
        error: 'Account temporarily locked. Try again later.',
        retryAfterSeconds: Math.ceil((new Date(adminUser.locked_until) - now) / 1000),
      });
    }

    const isValidPassword = await bcrypt.compare(password, adminUser.password_hash);

    if (!isValidPassword) {
      // Increment the failure counter if the column exists
      if (_adminHasFailedLoginCount) {
        await query(
          `UPDATE admin_users
           SET failed_login_count = COALESCE(failed_login_count, 0) + 1,
               locked_until = CASE
                 WHEN COALESCE(failed_login_count, 0) + 1 >= $2
                   THEN NOW() + ($3::int * INTERVAL '1 millisecond')
                 ELSE NULL
               END
           WHERE id = $1`,
          [adminUser.id, MAX_FAILED_LOGINS, LOCKOUT_MS]
        );
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Success: reset the counter and update last_login if columns exist
    if (_adminHasFailedLoginCount || _adminHasLockedUntil || _adminHasLastLogin) {
      const setClauses = [];
      if (_adminHasFailedLoginCount) setClauses.push('failed_login_count = 0');
      if (_adminHasLockedUntil) setClauses.push('locked_until = NULL');
      if (_adminHasLastLogin) setClauses.push('last_login = NOW()');
      await query(
        `UPDATE admin_users SET ${setClauses.join(', ')} WHERE id = $1`,
        [adminUser.id]
      );
    }

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
    await ensureAdminColumns();
    const id = req.admin?.id;
    if (!id) return res.status(401).json({ error: 'Not authenticated' });
    const cols = ['id', 'email'];
    if (_adminHasUsername) cols.push('username'); else cols.push('email AS username');
    if (_adminHasIsActive) cols.push('is_active'); else cols.push('true AS is_active');
    cols.push('created_at');
    if (_adminHasLastLogin) cols.push('last_login');
    const result = await query(
      `SELECT ${cols.join(', ')} FROM admin_users WHERE id = $1`,
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
    await ensureAdminColumns();
    const cols = ['id', 'email'];
    if (_adminHasUsername) cols.push('username'); else cols.push('email AS username');
    if (_adminHasIsActive) cols.push('is_active'); else cols.push('true AS is_active');
    cols.push('created_at');
    if (_adminHasLastLogin) cols.push('last_login');
    const result = await query(
      `SELECT ${cols.join(', ')} FROM admin_users ORDER BY created_at DESC`
    );
    const adminUsers = result.rows.map ({
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
    await ensureAdminColumns();
    const { username, email, password, isActive = true } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const existing = await query(`SELECT id FROM admin_users WHERE email = $1`, [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Admin user with this email already exists' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const insertCols = ['email', 'password_hash'];
    const insertVals = ['$1', '$2'];
    const params = [email, passwordHash];
    if (_adminHasUsername && username) {
      insertCols.push('username');
      insertVals.push(`$${params.length + 1}`);
      params.push(username);
    }
    if (_adminHasIsActive) {
      insertCols.push('is_active');
      insertVals.push(`$${params.length + 1}`);
      params.push(isActive);
    }
    const result = await query(
      `INSERT INTO admin_users (${insertCols.join(', ')})
       VALUES (${insertVals.join(', ')})
       RETURNING id, email, created_at`,
      params
    );
    const u = result.rows[0];
    res.status(201).json({
      message: 'Admin user created successfully',
      adminUser: { id: u.id, username: username || u.email, email: u.email, isActive: true, createdAt: u.created_at },
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    if (error.code === '23505') return res.status(409).json({ error: 'Admin user with this email or username already exists' });
    res.status(500).json({ error: 'Failed to create admin user' });
  }
};

export const updateAdminUser = async (req, res) => {
  try {
    await ensureAdminColumns();
    const { id } = req.params;
    const { username, email, password, isActive } = req.body;
    const userResult = await query(`SELECT id FROM admin_users WHERE id = $1`, [id]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'Admin user not found' });

    const updates = [];
    const params = [];
    let i = 1;
    if (username !== undefined && _adminHasUsername) { updates.push(`username = $${i++}`); params.push(username); }
    if (email !== undefined) { updates.push(`email = $${i++}`); params.push(email); }
    if (password !== undefined) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${i++}`); params.push(passwordHash);
    }
    if (isActive !== undefined && _adminHasIsActive) { updates.push(`is_active = $${i++}`); params.push(isActive); }
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
      adminUser: { id: u.id, username: u.email, email: u.email, isActive: true, createdAt: u.created_at, updatedAt: u.updated_at },
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
