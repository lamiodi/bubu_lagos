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
import { Search, Package, Truck, CheckCircle, Clock, XCircle, AlertCircle, Mail, HelpCircle, FileText, MessageSquare } from 'lucide-react';
import { API_BASE } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { EASE_OUT } from '../lib/motion';
import { OrderDetailSkeleton } from '../components/Skeleton';



const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-NG', {
    dateStyle: 'medium', timeStyle: 'short',
  });
};

const formatNaira = (n) => `₦${(Number(n) || 0).toLocaleString()}`;

export function TrackOrder() {
  const [searchParams] = useSearchParams();
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
          <p className="text-text-light text-sm max-w-md mx-auto">
            Enter the order reference code and the email address used during your checkout.
          </p>
        </div>

        <form onSubmit={handleTrack} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-text-light">
                  Order Reference
                </label>
                <span className="text-[10px] text-gray-400">Found in confirmation email</span>
              </div>
              <input
                type="text"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="e.g. BUBU-1700000000-A1B2"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors text-sm font-mono uppercase"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-text-light">
                  Email Used At Checkout
                </label>
                <span className="text-[10px] text-gray-400">Where receipt was sent</span>
              </div>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors text-sm"
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
              className="w-full bg-black text-white py-3.5 rounded-lg font-medium text-sm hover:bg-black/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="h-4 w-4 rounded shimmer-light" />
              ) : (
                <Search size={16} />
              )}
              {loading ? 'Tracking…' : 'Track Order'}
            </button>
          </div>
        </form>

        {/* Loading Skeleton state */}
        {loading && (
          <div className="mb-8">
            <OrderDetailSkeleton />
          </div>
        )}

        {/* Guidance Card: Where to find this information */}
        {!result && !loading && (
          <div className="bg-gray-50/80 rounded-2xl border border-gray-200/60 p-6 sm:p-7 mb-8">
            <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-black">
              <HelpCircle size={16} className="text-accent" />
              <span>Where to find your order details?</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
              <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
                <FileText size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-gray-900 block mb-1">Order Confirmation Email</span>
                  <p className="leading-relaxed text-[11px]">
                    Check your email inbox for an email subject <strong>&quot;Order Confirmed - Bubu Lagos&quot;</strong> or <strong>&quot;Payment Received&quot;</strong>. Your reference code (e.g. <code>BUBU-...</code>) is listed at the top.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
                <Mail size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-gray-900 block mb-1">Checkout Email Address</span>
                  <p className="leading-relaxed text-[11px]">
                    Use the exact email address specified during checkout. If you used Apple Pay or Express Checkout, check the email connected to that account.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-200/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-500">
              <span>Still having trouble finding your order?</span>
              <Link
                to="/contact"
                className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-black hover:text-accent transition-colors"
              >
                <MessageSquare size={13} />
                Contact Client Concierge
              </Link>
            </div>
          </div>
        )}

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
