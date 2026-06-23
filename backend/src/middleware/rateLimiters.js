// Centralised rate limiters. Lives in its own file so route modules can
// import them without a circular dependency on index.js.

import rateLimit from 'express-rate-limit';

// Per-IP limiter for the whole /api tree. Configurable via env so the
// POS / busy checkout flow can be tuned without a code change.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS', // never count CORS preflights
});

// Per-IP limiter for the auth-sensitive endpoints (login, register,
// forgot-password, reset-password). 10 attempts / 5 min keeps brute
// force impractical without locking out a real user.
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts. Try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});

// Heavier limiter for the password-reset flow specifically (the email
// side-effect is what makes it dangerous to spam).
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many password-reset requests. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});

// Tighter limiter on the public order-tracking endpoint. The endpoint
// requires BOTH a reference and an email to match an order, which makes
// pure guessing impossible, but a bot that *already knows* a valid
// (ref, email) pair (e.g. scraped from a leaked inbox) could still
// poll it to enumerate status changes. 20 / 15min / IP is more than
// enough for a human tracking their own order.
export const trackOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many track-order requests. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});
