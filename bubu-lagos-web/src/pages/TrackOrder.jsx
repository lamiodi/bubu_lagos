// ===========================================================================
// TrackOrder.jsx — guest-only order tracking with luxury timeline & courier tracking
// ===========================================================================

import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Package, Truck, CheckCircle2, Clock, XCircle, 
  AlertCircle, Mail, HelpCircle, FileText, MessageSquare, 
  Copy, Check, ExternalLink, Sparkles, MapPin, ShieldCheck
} from 'lucide-react';
import { API_BASE } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { EASE_OUT } from '../lib/motion';
import { OrderDetailSkeleton } from '../components/Skeleton';
import { getImageUrl, FALLBACK_IMAGE } from '../lib/utils';

const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-NG', {
    dateStyle: 'medium', timeStyle: 'short',
  });
};

const formatNaira = (n) => `₦${(Number(n) || 0).toLocaleString()}`;

const formatAddressString = (addr) => {
  if (!addr) return 'Address on file';
  if (typeof addr === 'string') {
    try {
      const parsed = JSON.parse(addr);
      if (parsed && typeof parsed === 'object') {
        return formatAddressString(parsed);
      }
    } catch {
      return addr;
    }
    return addr;
  }
  if (typeof addr === 'object') {
    const parts = [
      addr.address,
      addr.apartment ? `Apt / Suite: ${addr.apartment}` : null,
      [addr.city, addr.state].filter(Boolean).join(', '),
      addr.zipCode || addr.postalCode || null
    ].filter(Boolean);
    return parts.join('\n') || 'Address on file';
  }
  return String(addr);
};

const STAGES = [
  { id: 'placed', label: 'Order Placed', desc: 'Received & Queued' },
  { id: 'processing', label: 'Atelier Crafting', desc: 'Bespoke Preparation' },
  { id: 'shipped', label: 'In Transit', desc: 'Dispatched with Courier' },
  { id: 'delivered', label: 'Delivered', desc: 'Arrived at Destination' }
];

const getActiveStageIndex = (status) => {
  switch (status) {
    case 'Pending':
      return 0;
    case 'Paid':
    case 'Processing':
      return 1;
    case 'Shipped':
      return 2;
    case 'Delivered':
      return 3;
    case 'Cancelled':
    case 'Failed':
      return -1;
    default:
      return 0;
  }
};

const STATUS_BADGES = {
  'Pending': 'bg-amber-50 text-amber-800 border-amber-200',
  'Paid': 'bg-blue-50 text-blue-800 border-blue-200',
  'Processing': 'bg-indigo-50 text-indigo-800 border-indigo-200',
  'Shipped': 'bg-purple-50 text-purple-800 border-purple-200',
  'Delivered': 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Cancelled': 'bg-rose-50 text-rose-800 border-rose-200',
  'Failed': 'bg-red-50 text-red-800 border-red-200'
};

export function TrackOrder() {
  const [searchParams] = useSearchParams();
  const [ref, setRef] = useState(searchParams.get('ref') || '');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const toast = useToast();

  const handleTrack = async (e, overrideRef, overrideEmail) => {
    e?.preventDefault();
    const queryRef = (overrideRef !== undefined ? overrideRef : ref).trim();
    const queryEmail = (overrideEmail !== undefined ? overrideEmail : email).trim().toLowerCase();

    setError(null);
    if (!queryRef || !queryEmail) {
      setError('Please enter both your order reference code and email.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/orders/track?ref=${encodeURIComponent(queryRef)}&email=${encodeURIComponent(queryEmail)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Order not found. Check your reference and email.');
        setResult(null);
        return;
      }
      setResult(data);
    } catch (err) {
      console.error('Track order error:', err);
      setError('Network error. Please check your connection and try again.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-execute if query params are present in URL
  useEffect(() => {
    const urlRef = searchParams.get('ref');
    const urlEmail = searchParams.get('email');
    if (urlRef && urlEmail) {
      setRef(urlRef);
      setEmail(urlEmail);
      handleTrack(null, urlRef, urlEmail);
    }
  }, []);

  const copyToClipboard = (text, type) => {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      if (type === 'ref') {
        setCopiedRef(true);
        setTimeout(() => setCopiedRef(false), 2000);
      } else {
        setCopiedTracking(true);
        setTimeout(() => setCopiedTracking(false), 2000);
      }
      toast?.success('Copied to clipboard');
    });
  };

  const activeStage = result?.order?.status ? getActiveStageIndex(result.order.status) : 0;
  const isCancelled = result?.order?.status === 'Cancelled' || result?.order?.status === 'Failed';

  return (
    <div className="min-h-screen bg-[#faf8f5] pt-24 pb-20 px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className="max-w-3xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent block mb-2">
            Bespoke Client Service
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-gray-900">
            Track Your Order
          </h1>
          <p className="text-text-light text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            Follow your handcrafted Bubu Lagos piece from our Lagos atelier to your doorstep.
          </p>
        </div>

        {/* Search Box */}
        <form onSubmit={handleTrack} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-text-light">
                  Order Reference
                </label>
                <span className="text-[10px] text-gray-400">e.g. BUBU-...</span>
              </div>
              <input
                type="text"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="BUBU-1700000000-A1B2"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors text-xs font-mono uppercase bg-gray-50/50"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-text-light">
                  Email Address
                </label>
                <span className="text-[10px] text-gray-400">Used at checkout</span>
              </div>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors text-xs bg-gray-50/50"
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50/80 border border-red-200 p-3.5 rounded-xl mb-4">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-neutral-800 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <div className="h-4 w-4 rounded shimmer-light" />
            ) : (
              <Search size={16} />
            )}
            {loading ? 'Locating Order…' : 'Track Order Status'}
          </button>
        </form>

        {/* Loading Skeleton */}
        {loading && (
          <div className="mb-8">
            <OrderDetailSkeleton />
          </div>
        )}

        {/* Helper Card if no result searched yet */}
        {!result && !loading && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6 sm:p-7 mb-8 shadow-2xs">
            <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-black">
              <HelpCircle size={16} className="text-accent" />
              <span>Where to find your order details?</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
              <div className="flex items-start gap-3 bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                <FileText size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-gray-900 block mb-1">Confirmation Email</span>
                  <p className="leading-relaxed text-[11px]">
                    Check your inbox for <strong>&quot;Order Confirmation - Bubu Lagos&quot;</strong>. Your reference code is prominently shown at the top.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                <Mail size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-gray-900 block mb-1">Receipt Email</span>
                  <p className="leading-relaxed text-[11px]">
                    Make sure to enter the exact email address used at checkout, or your Paystack transaction receipt email.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-200/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-500">
              <span>Have questions about your order or delivery timeline?</span>
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

        {/* Order Details & Progress Section */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="space-y-6"
          >
            {/* Main Order Card with Progress Timeline */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
              {/* Reference and Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-gray-100">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-light mb-1">
                    Order Reference
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg sm:text-xl font-bold font-mono text-black">
                      {result.order.reference}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(result.order.reference, 'ref')}
                      className="p-1.5 text-gray-400 hover:text-black rounded-lg transition-colors bg-gray-50 hover:bg-gray-100"
                      title="Copy Reference"
                      aria-label="Copy order reference"
                    >
                      {copiedRef ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${STATUS_BADGES[result.order.status] || 'bg-gray-50 text-gray-800 border-gray-200'}`}>
                  {result.order.status}
                </span>
              </div>

              {/* Progress Timeline Stepper */}
              {!isCancelled ? (
                <div className="py-8 border-b border-gray-100">
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-light mb-6">
                    Fulfillment Progress
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
                    {STAGES.map((stage, idx) => {
                      const isComplete = activeStage > idx || (activeStage === 3 && idx === 3);
                      const isCurrent = activeStage === idx;
                      return (
                        <div key={stage.id} className="flex flex-col items-center text-center relative z-10">
                          {/* Circle Icon */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2.5 transition-all ${
                            isComplete
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : isCurrent
                                ? 'bg-black text-white ring-4 ring-black/10 animate-pulse'
                                : 'bg-gray-100 text-gray-400'
                          }`}>
                            {isComplete ? (
                              <CheckCircle2 size={18} />
                            ) : isCurrent ? (
                              idx === 2 ? <Truck size={18} /> : idx === 3 ? <Package size={18} /> : <Clock size={18} />
                            ) : (
                              <span className="text-xs font-bold font-mono">{idx + 1}</span>
                            )}
                          </div>

                          <div className={`text-xs font-bold ${isCurrent ? 'text-black' : isComplete ? 'text-emerald-700' : 'text-gray-400'}`}>
                            {stage.label}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            {stage.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-6 border-b border-gray-100">
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
                    <XCircle size={20} className="text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-bold text-rose-900">Order {result.order.status}</div>
                      <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                        This order has been {result.order.status.toLowerCase()}. If you have any inquiries or require a refund status update, please contact our concierge.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Courier & Tracking Details Card */}
              {result.order.trackingNumber && (
                <div className="my-6 p-4 sm:p-5 bg-purple-50/60 border border-purple-100 rounded-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Truck size={16} className="text-purple-700" />
                        <span className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                          {result.order.shippingCarrier || 'Express Courier'} Tracking
                        </span>
                      </div>
                      <div className="font-mono text-sm font-bold text-purple-900">
                        {result.order.trackingNumber}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(result.order.trackingNumber, 'track')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-purple-200 text-purple-900 rounded-lg text-xs font-medium hover:bg-purple-50 transition-colors"
                      >
                        {copiedTracking ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        <span>Copy Code</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-light mb-1">
                    Order Date
                  </div>
                  <div className="text-gray-900 font-medium">{formatDate(result.order.createdAt)}</div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-light mb-1">
                    Payment Total
                  </div>
                  <div className="text-sm font-extrabold text-black font-mono">
                    {formatNaira(result.order.totalAmount)}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-light mb-1">
                    Customer Name
                  </div>
                  <div className="text-gray-900 font-medium">{result.order.customerName || 'Valued Client'}</div>
                </div>

                <div className="sm:col-span-3 pt-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-text-light mb-1">
                    <MapPin size={12} className="text-accent" />
                    <span>Shipping Destination</span>
                  </div>
                  <div className="text-xs text-gray-800 bg-gray-50/80 p-3.5 rounded-xl border border-gray-100 whitespace-pre-line leading-relaxed">
                    {formatAddressString(result.order.shippingAddress)}
                  </div>
                </div>
              </div>
            </div>

            {/* Items Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-light mb-5">
                Handcrafted Pieces in Order ({result.items?.length || 0})
              </h2>
              <ul className="divide-y divide-gray-100">
                {result.items.map((it, i) => {
                  const img = it.images && it.images[0] ? getImageUrl(it.images[0]) : FALLBACK_IMAGE;
                  return (
                    <li key={i} className="py-4 flex items-start gap-4">
                      <img
                        src={img}
                        alt={it.productName}
                        className="w-16 h-20 object-cover rounded-lg flex-shrink-0 border border-gray-100"
                        onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-heading font-bold text-sm text-gray-900 uppercase tracking-wide">
                          {it.productName}
                        </div>
                        {it.variantName && (
                          <span className="inline-block mt-1 text-[11px] px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-medium">
                            Size: {it.variantName}
                          </span>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          Qty: <span className="font-bold text-black">{it.quantity}</span> × {formatNaira(it.unitPrice)}
                        </div>
                      </div>
                      <div className="text-sm font-bold font-mono whitespace-nowrap text-black">
                        {formatNaira(it.totalPrice)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Concierge & Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
              <Link
                to="/shop"
                className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-xl text-xs font-bold uppercase tracking-widest text-center hover:bg-black hover:text-white hover:border-black transition-all"
              >
                Continue Browsing
              </Link>
              <Link
                to="/contact"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-text-light hover:text-black transition-colors"
              >
                <MessageSquare size={14} />
                Need Assistance? Contact Concierge
              </Link>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default TrackOrder;
