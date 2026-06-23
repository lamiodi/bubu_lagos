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

    const result = await query(
      `SELECT id, email, username, is_active FROM admin_users WHERE id = $1 AND is_active = true`,
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
