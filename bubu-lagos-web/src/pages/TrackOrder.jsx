// ===========================================================================
// TrackOrder.jsx — guest-only order tracking
//
// No login needed. The customer enters their order reference and the
// email they used at checkout. Hits GET /api/orders/track and renders
// the status timeline + items list.
// ===========================================================================

import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Package, Truck, CheckCircle, Clock, XCircle, AlertCircle, Mail } from 'lucide-react';
import { API_BASE } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { EASE_OUT } from '../lib/motion';

const STATUS_STEPS = [
  { value: 'pending',   label: 'Order Placed',   icon: Clock },
  { value: 'paid',      label: 'Payment Confirmed', icon: CheckCircle },
  { value: 'processing',label: 'Processing',     icon: Package },
  { value: 'shipped',   label: 'Shipped',        icon: Truck },
  { value: 'delivered', label: 'Delivered',      icon: CheckCircle },
  { value: 'cancelled', label: 'Cancelled',      icon: XCircle },
];

const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-NG', {
    dateStyle: 'medium', timeStyle: 'short',
  });
};

const formatNaira = (n) => `₦${(Number(n) || 0).toLocaleString()}`;

export function TrackOrder() {
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const [ref, setRef] = useState(searchParams.get('ref') || '');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleTrack = async (e) => {
    e?.preventDefault();
    setError(null);
    setResult(null);
    if (!ref.trim() || !email.trim()) {
      setError('Please enter both your order reference and email.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/orders/track?ref=${encodeURIComponent(ref.trim())}&email=${encodeURIComponent(email.trim().toLowerCase())}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Order not found. Check your reference and email.');
        return;
      }
      setResult(data);
    } catch (err) {
      console.error('Track order error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-20 px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className="max-w-2xl mx-auto"
      >
        <div className="text-center mb-10">
          <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight mb-3">
            Track Your Order
          </h1>
          <p className="text-text-light text-sm">
            Enter the order reference and the email you used at checkout.
          </p>
        </div>

        <form onSubmit={handleTrack} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-text-light mb-2">
                Order Reference
              </label>
              <input
                type="text"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="e.g. BUBU-1700000000-A1B2"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-text-light mb-2">
                Email Used At Checkout
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                  required
                />
              </div>
            </div>
            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3 rounded-lg font-medium text-sm hover:bg-black/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Search size={16} />
              )}
              {loading ? 'Tracking…' : 'Track Order'}
            </button>
          </div>
        </form>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-light mb-1">
                    Order
                  </div>
                  <div className="text-xl font-bold">{result.order.reference}</div>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black text-white">
                  {result.order.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-light mb-1">
                    Placed
                  </div>
                  <div>{formatDate(result.order.createdAt)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-light mb-1">
                    Total
                  </div>
                  <div className="font-bold">{formatNaira(result.order.totalAmount)}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-light mb-1">
                    Shipping To
                  </div>
                  <div className="text-sm whitespace-pre-line">
                    {typeof result.order.shippingAddress === 'string'
                      ? result.order.shippingAddress
                      : JSON.stringify(result.order.shippingAddress, null, 2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-light mb-4">
                Items
              </h2>
              <ul className="divide-y divide-gray-100">
                {result.items.map((it, i) => (
                  <li key={i} className="py-3 flex items-start gap-4">
                    {it.images && it.images[0] ? (
                      <img
                        src={it.images[0]}
                        alt={it.productName}
                        className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-md flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{it.productName}</div>
                      {it.variantName && (
                        <div className="text-xs text-text-light mt-0.5">{it.variantName}</div>
                      )}
                      <div className="text-xs text-text-light mt-1">
                        {it.quantity} × {formatNaira(it.unitPrice)}
                      </div>
                    </div>
                    <div className="text-sm font-bold whitespace-nowrap">
                      {formatNaira(it.totalPrice)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-center">
              <Link to="/shop" className="text-xs uppercase tracking-[0.12em] text-text-light hover:text-black transition-colors">
                Continue Shopping
              </Link>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default TrackOrder;
