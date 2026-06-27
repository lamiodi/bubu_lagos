// ===========================================================================
// authMiddleware.js — admin-only edition
//
// Customer authentication has been removed (guest checkout). The only
// JWT-protected endpoints left are admin routes.
// ===========================================================================

import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const isProd = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
  const msg = '[bubu-auth] JWT_SECRET is not set. Refusing to start.';
  if (isProd) { console.error(msg); process.exit(1); }
  else { console.warn(msg + ' (dev only — set it before going live).'); }
}

// ---------------------------------------------------------------------------
// generateAdminToken
//   Sign a short-lived JWT for an authenticated admin. Type === 'admin' is
//   required (and verified by authenticateAdmin below).
// ---------------------------------------------------------------------------
export const generateAdminToken = (adminUserId) => {
  return jwt.sign(
    { userId: adminUserId, type: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// ---------------------------------------------------------------------------
// hasColumn — check if a column exists in the admin_users table.
//   The table may live in `bubu` (shared schema) or `public` (standalone).
//   Some columns (username, is_active) are added by local migrations that
//   are skipped when the shared schema is present.
// ---------------------------------------------------------------------------
let _authColumnCache = null;
async function hasColumn(col) {
  if (_authColumnCache === null) {
    const schemaRes = await query(
      `SELECT table_schema FROM information_schema.tables
       WHERE table_name = 'admin_users'
         AND table_schema IN ('bubu', 'public')
       LIMIT 1`
    );
    const schema = schemaRes.rows[0]?.table_schema || 'public';
    const r = await query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'admin_users'`,
      [schema]
    );
    _authColumnCache = new Set(r.rows.map((x) => x.column_name));
  }
  return _authColumnCache.has(col);
}

// ---------------------------------------------------------------------------
// authenticateAdmin
//   Verifies Bearer token, confirms role === 'admin', and attaches the
//   active admin_users row to req.adminUser.
// ---------------------------------------------------------------------------
export const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Build SELECT dynamically — username/is_active may not exist in the
    // shared bubu schema.
    const cols = ['id', 'email'];
    if (await hasColumn('username')) cols.push('username');
    if (await hasColumn('is_active')) cols.push('is_active');
    const selectList = cols.join(', ');
    const whereActive = (await hasColumn('is_active'))
      ? 'AND is_active = true'
      : '';

    const result = await query(
      `SELECT ${selectList} FROM admin_users WHERE id = $1 ${whereActive}`,
      [decoded.userId]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Admin user not found or inactive' });
    }

    req.adminUser = result.rows[0];
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    if (error.name === 'JsonWebTokenError')  return res.status(401).json({ error: 'Invalid token' });
    if (error.name === 'TokenExpiredError')  return res.status(401).json({ error: 'Token expired' });
    res.status(500).json({ error: 'Authentication failed' });
  }
};
