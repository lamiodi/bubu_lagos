import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import helmet from 'helmet';
import { apiLimiter } from './middleware/rateLimiters.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import marketingRoutes from './routes/marketingRoutes.js';
import giftCardRoutes from './routes/giftCardRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import { startCronJobs } from './services/cronService.js';
import { getPoolStats } from './db.js';

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';

// ---------------------------------------------------------------------------
// Boot-time env validation. In production, refuse to start if any critical
// secret is missing or still on a well-known placeholder. In dev, warn
// loudly so the developer notices.
// ---------------------------------------------------------------------------
const requiredProd = [
  'DATABASE_URL',
  'JWT_SECRET',
  'PAYSTACK_SECRET_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];
const PLACEHOLDERS = [
  'your-super-secret',
  'change-in-production',
  'sk_test_your_',
  'pk_test_your_',
  'your_cloud_',
  'your_api_',
  're_your_',
];
for (const k of requiredProd) {
  if (!process.env[k]) {
    const msg = `Missing required env var: ${k}`;
    if (IS_PROD) { console.error(msg); process.exit(1); }
    else { console.warn(`[bubu] WARNING: ${msg}`); }
  } else if (IS_PROD && PLACEHOLDERS.some(p => String(process.env[k]).includes(p))) {
    console.error(`[bubu] Refusing to start: ${k} looks like a placeholder. Set a real value.`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Process error handlers — log and exit cleanly so Render can restart
// the container rather than leaving it in a wedged state.
// ---------------------------------------------------------------------------
process.on('uncaughtException', (err) => {
  console.error('[bubu] uncaughtException:', err);
  // Synchronous errors are not safe to keep serving. Give Render the
  // signal to restart us.
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[bubu] unhandledRejection:', reason);
  // Async rejections don't necessarily mean we must die, but log loudly
  // so they're not silently swallowed.
});

// ---------------------------------------------------------------------------
// Background tasks
// ---------------------------------------------------------------------------
startCronJobs();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ---------------------------------------------------------------------------
// Behind Render's reverse proxy so req.ip, rate-limit keys, and X-Forwarded-* headers
// resolve correctly. 1 hop = Render's load balancer.
// ---------------------------------------------------------------------------
app.set('trust proxy', 1);

// ---------------------------------------------------------------------------
// Helmet: secure default headers, but keep CORP=Cross-Origin so the frontend
// (served from a different Vercel origin) can still display Cloudinary /
// /uploads images. HSTS only in production.
// ---------------------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: false,                       // JSON API; no inline scripts
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'same-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  hsts: IS_PROD
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
}));

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`[bubu] CORS blocked origin: ${origin}`);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // Cache preflight for 24h
};
app.use(cors(corsOptions));

// Explicit OPTIONS handler — ensures preflight even if cors middleware
// is bypassed by something upstream (proxy, etc).
app.options('*', cors(corsOptions));

// ---------------------------------------------------------------------------
// Body parsers
//   * JSON: 100 KB is plenty for orders, login, etc. The webhook needs the
//     raw body for HMAC verification, so we capture it via the verify callback.
//   * urlencoded: 10 MB for the (legacy) disk-based image upload route.
// ---------------------------------------------------------------------------
app.use(express.json({
  limit: '100kb',
  verify: (req, _res, buf) => {
    // Buffer is what routes/webhookRoutes.js needs for HMAC SHA-512.
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---------------------------------------------------------------------------
// Rate limiters
//   * General: 100 / 15 min / IP for the whole /api tree.
//   * Auth:    10 / 5 min / IP, applied on login + register + forgot-password.
//     express-rate-limit v7 skips OPTIONS preflights automatically, so CORS
//     preflight traffic is not counted.
// ---------------------------------------------------------------------------
app.use('/api/', apiLimiter);

// ---------------------------------------------------------------------------
// Lightweight request logger — single line per request, no deps.
// Skip /api/health so Render's probe doesn't spam the log.
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  if (req.path === '/api/health') return next();
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(`[bubu] ${req.method} ${req.originalUrl} -> ${res.statusCode} ${ms.toFixed(1)}ms`);
  });
  next();
});

// ---------------------------------------------------------------------------
// Static uploads (legacy disk-backed images). New uploads go to Cloudinary.
// UPLOADS_PATH env var is optional — only set it when a Render Persistent
// Disk is attached. The local src/uploads folder is always writable.
// ---------------------------------------------------------------------------
const uploadsPath = process.env.UPLOADS_PATH || path.join(__dirname, 'uploads');
if (!existsSync(uploadsPath)) {
  try {
    mkdirSync(uploadsPath, { recursive: true });
  } catch (e) {
    console.warn(`[bubu] Could not create uploads dir (${uploadsPath}): ${e.message}. Legacy local uploads will be unavailable — all new uploads should use Cloudinary.`);
  }
}
app.use('/uploads', express.static(uploadsPath));

// ---------------------------------------------------------------------------
// Routes — order matters: health is unrate-limited and is the first thing
// Render hits during a health check.
// ---------------------------------------------------------------------------
app.get('/api/health', async (_req, res) => {
  const result = { status: 'ok', service: 'bubu-lagos-backend', uptime: process.uptime() };
  try {
    const t0 = Date.now();
    const { rows } = await getPoolStats();
    const dbMs = Date.now() - t0;
    result.db = { ok: true, ms: dbMs, total: rows.totalCount, idle: rows.idleCount, waiting: rows.waitingCount };
  } catch (e) {
    result.status = 'degraded';
    result.db = { ok: false, error: e.message };
  }
  result.cloudinary = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  result.paystack    = Boolean(process.env.PAYSTACK_SECRET_KEY);
  result.corsOrigin = process.env.CORS_ORIGIN || '(not set — defaults to localhost)';
  res.status(result.status === 'ok' ? 200 : 503).json(result);
});

app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/gift-cards', giftCardRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/webhooks', webhookRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------
app.use((err, req, res, _next) => {
  console.error('[bubu] unhandled error on', req.method, req.originalUrl, '->', err);
  const isDev = !IS_PROD;
  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong!',
    ...(isDev && { stack: err.stack }),
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[bubu] Server running on port ${PORT} (env=${NODE_ENV})`);
});

// ---------------------------------------------------------------------------
// Graceful shutdown — Render sends SIGTERM and waits 30 s for clean exit.
// We stop accepting new requests, drain in-flight ones, close the DB pool,
// then exit.
// ---------------------------------------------------------------------------
let shuttingDown = false;
const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[bubu] ${signal} received. Shutting down...`);
  server.close(async (err) => {
    if (err) console.error('[bubu] server.close error:', err);
    try {
      const { default: pool } = await import('./db.js');
      await pool.end();
      console.log('[bubu] DB pool closed.');
    } catch (e) {
      console.error('[bubu] pool.end error:', e);
    }
    process.exit(err ? 1 : 0);
  });
  // Hard-exit fallback if graceful close takes too long.
  setTimeout(() => {
    console.warn('[bubu] Forced exit after 25s.');
    process.exit(1);
  }, 25000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

export default app;
