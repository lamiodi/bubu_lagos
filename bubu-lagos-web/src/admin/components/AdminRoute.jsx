import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api, { apiEvents, setSessionKind } from '../../utils/api';
import { logger } from '../../lib/logger';

/**
 * Guards /admin/* routes.
 *
 * - On mount, sets the API session kind to "admin" and probes /admin/me
 *   (a backend endpoint that should return the current admin user or 401).
 * - Subscribes to API 401 events; if the admin token is rejected, redirects
 *   to /admin/login.
 */
export function AdminRoute({ children }) {
  const [status, setStatus] = useState('checking'); // 'checking' | 'authorized' | 'unauthorized'

  useEffect(() => {
    setSessionKind('admin');
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');

    if (!token || !user) {
      setStatus('unauthorized');
      return undefined;
    }

    // Probe the backend to verify the token is still valid.
    let cancelled = false;
    api.get('/admin/me')
      .then(() => { if (!cancelled) setStatus('authorized'); })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 401) {
          setStatus('unauthorized');
        } else {
          // Network / server error — fall back to optimistic allow (backend will 401 if needed).
          logger.warn('AdminRoute probe failed; allowing optimistically:', err.message);
          setStatus('authorized');
        }
      });

    const off = apiEvents.on((evt) => {
      if (evt.type === 'unauthorized' && evt.kind === 'admin') {
        setStatus('unauthorized');
      }
    });

    return () => {
      cancelled = true;
      off();
    };
  }, []);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex bg-gray-50" aria-label="Checking session">
        {/* Sidebar skeleton */}
        <div className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 p-4 gap-3">
          <div className="h-10 w-32 shimmer-light rounded mb-4" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 shimmer-light rounded-lg" />
          ))}
        </div>
        {/* Main content skeleton */}
        <div className="flex-1 p-8 space-y-6">
          <div className="h-8 w-48 shimmer-light rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 shimmer-light rounded-xl" />
            ))}
          </div>
          <div className="h-64 shimmer-light rounded-xl" />
        </div>
      </div>
    );
  }

  if (status === 'unauthorized') {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
