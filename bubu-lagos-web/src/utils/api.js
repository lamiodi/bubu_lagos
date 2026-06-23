/**
 * Centralized API client.
 *
 * - Reads auth token from a "session kind" (admin | customer) tracked in module state,
 *   not from `window.location.pathname`, so it's testable and SSR-safe.
 * - Adds a 401 interceptor that clears tokens and broadcasts a `bubulagos:auth:unauthorized`
 *   event. Listeners (AdminRoute, AuthContext, etc.) decide what to do (redirect to login).
 * - Accepts an `AbortController.signal` for cancellation in long-lived pages.
 * - Single `request()` path used by every verb (get, post, put, delete, upload).
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

let sessionKind = 'customer'; // 'admin' | 'customer'

const listeners = new Set();

export const apiEvents = {
  /** Subscribe to API-level events (e.g. 'unauthorized:admin', 'unauthorized:customer'). */
  on(handler) {
    listeners.add(handler);
    return () => listeners.delete(handler);
  },
  emit(event) {
    listeners.forEach((l) => {
      try { l(event); } catch { /* ignore */ }
    });
  },
};

export function setSessionKind(kind) {
  sessionKind = kind === 'admin' ? 'admin' : 'customer';
}

export function getSessionKind() {
  return sessionKind;
}

function getToken() {
  return localStorage.getItem(sessionKind === 'admin' ? 'adminToken' : 'authToken');
}

function clearSession() {
  if (sessionKind === 'admin') {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
  } else {
    localStorage.removeItem('authToken');
    localStorage.removeItem('customer');
  }
}

async function request(endpoint, { method = 'GET', body, headers = {}, isForm = false, signal } = {}) {
  const url = `${API_URL}${endpoint}`;

  const config = {
    method,
    headers: { ...headers },
    signal,
  };

  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined && body !== null) {
    if (isForm) {
      // Caller built a FormData; do not set Content-Type (browser does it with boundary).
      config.body = body;
    } else {
      config.headers['Content-Type'] = config.headers['Content-Type'] || 'application/json';
      config.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
  }

  const response = await fetch(url, config);

  // 401 — token invalid/expired. Clear it and let listeners react.
  if (response.status === 401) {
    const kind = sessionKind;
    clearSession();
    apiEvents.emit({ type: 'unauthorized', kind });
    const error = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!response.ok) {
    const error = new Error((data && data.error) || `Request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (endpoint, opts = {}) => request(endpoint, { ...opts, method: 'GET' }),
  post: (endpoint, body, opts = {}) => request(endpoint, { ...opts, method: 'POST', body }),
  put: (endpoint, body, opts = {}) => request(endpoint, { ...opts, method: 'PUT', body }),
  delete: (endpoint, opts = {}) => request(endpoint, { ...opts, method: 'DELETE' }),
  upload: (endpoint, formData, method = 'POST', opts = {}) =>
    request(endpoint, { ...opts, method, body: formData, isForm: true }),
};

export default api;
