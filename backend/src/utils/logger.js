/**
 * Simple logger utility for backend.
 * In production, logs are structured JSON for log aggregation services.
 * In development, logs are human-readable.
 */

const IS_PROD = process.env.NODE_ENV === 'production';

function formatMessage(level, message, meta = {}) {
  if (IS_PROD) {
    return JSON.stringify({
      level,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    });
  }
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  info(message, meta) {
    console.log(formatMessage('info', message, meta));
  },
  warn(message, meta) {
    console.warn(formatMessage('warn', message, meta));
  },
  error(message, meta) {
    console.error(formatMessage('error', message, meta));
  },
  debug(message, meta) {
    if (!IS_PROD) {
      console.log(formatMessage('debug', message, meta));
    }
  },
};

export default logger;
