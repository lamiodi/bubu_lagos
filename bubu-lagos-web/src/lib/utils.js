import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getImageUrl(imagePath) {
  if (!imagePath) return null;
  let url = imagePath;
  if (url.startsWith('http://res.cloudinary.com')) {
    url = url.replace('http://res.cloudinary.com', 'https://res.cloudinary.com');
  }
  if (url.includes('cloudinary.com')) {
    if (url.includes('/video/upload/')) {
      if (!url.includes('/f_mp4') && !url.includes('/f_auto')) {
        url = url.replace('/video/upload/', '/video/upload/f_mp4,q_auto/');
      }
      if (url.toLowerCase().endsWith('.mov')) {
        url = url.replace(/\.mov$/i, '.mp4');
      }
    } else if (url.includes('/image/upload/')) {
      if (!url.includes('/f_auto') && !url.includes('/q_auto')) {
        url = url.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
      }
    }
  }
  if (url.startsWith('http')) return url;
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  return `${baseUrl}${url}`;
}

/**
 * Format a numeric price as a localized currency string with the ₦ symbol.
 * Accepts a number, or a string like "₦285,000" or "285000".
 */
export function formatProductPrice(value) {
  if (value === null || value === undefined) return '₦0';
  if (typeof value === 'number') {
    return `₦${value.toLocaleString()}`;
  }
  const numeric = parseInt(String(value).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(numeric) ? `₦${numeric.toLocaleString()}` : String(value);
}

/**
 * Extract a numeric value from a price (string or number).
 */
export function parsePriceValue(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const numeric = parseInt(String(value).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(numeric) ? numeric : 0;
}

/**
 * Standard max-width container class. Use this across pages for visual consistency.
 */
export const CONTAINER_CLASS = 'max-w-[1400px] mx-auto px-5 md:px-8';

/**
 * Currency symbol - centralized for future i18n.
 */
export const CURRENCY_SYMBOL = '₦';

/**
 * Format a number as Nigerian Naira. Uses a literal ₦ prefix to keep the
 * output consistent across all surfaces (web, email, SMS).
 */
export function formatNGN(amount) {
  const n = Number(amount) || 0;
  return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

/**
 * Format a date string for admin list views.
 * - `withTime: true` adds HH:MM
 */
export function formatDate(value, { withTime = false } = {}) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const opts = withTime
    ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' };
  return d.toLocaleDateString('en-NG', opts);
}

/**
 * Safe initials: "First Last" → "FL", "Bubu Lagos" → "BL", null → "?".
 */
export function getInitials(name, fallback = '?') {
  if (!name) return fallback;
  return String(name)
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

/**
 * Fallback image used when a product has no image, or when an image URL
 * fails to load. Kept here (not in a sample/mock data file) so the frontend
 * has zero hardcoded product data — everything comes from the database.
 */
export const FALLBACK_IMAGE = '/logo.png';

/**
 * Class-merge helper for conditional classNames.
 */
export function cx(...args) {
  return args.filter(Boolean).join(' ');
}
