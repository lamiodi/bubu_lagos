/**
 * Tiny wrapper around console.* methods.
 * In development, logs to the browser console.
 * In production, logs are silently dropped (or sent to Sentry when configured).
 */

const isDev = import.meta.env.DEV;

function noop() {}

function safe(fn) {
  if (isDev) return fn;
  return noop;
}

export const logger = {
  log: safe((...args) => console.log(...args)),
  info: safe((...args) => console.info(...args)),
  warn: safe((...args) => console.warn(...args)),
  error: safe((...args) => console.error(...args)),
  debug: safe((...args) => console.debug(...args)),
};

export default logger;
