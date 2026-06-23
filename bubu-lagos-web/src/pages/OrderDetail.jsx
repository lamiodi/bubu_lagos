import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { API_BASE } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { logger } from '../lib/logger';
import { ChevronLeft, Package, MapPin, CreditCard, Mail } from 'lucide-react';

/**
 * Order detail page (guest). Fetches a single order by reference AND
 * the buyer's email. Two-factor "proof of purchase" — same model as
 * /track-order. The reference alone is not enough.
 *
 * If the email isn't already known (e.g. the user opened this URL
 * cold from an email link with both params), we use ?email=… from
 * the URL. Otherwise we ask for it in a small inline form so the
 * stored value never leaves the visitor's machine.
 */
export function OrderDetail() {
  const { reference } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Pull email from URL or localStorage. URL wins so the email-link
    // flow (e.g. "View your order" link) works without any prior
    // localStorage state.
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('email');
    const fromStorage = localStorage.getItem(`orderEmail:${reference}`);
    if (fromUrl) {
      setEmail(fromUrl.toLowerCase());
    } else if (fromStorage) {
      setEmail(fromStorage);
    }
  }, [reference]);

  const fetchOrder = async (e) => {
    e?.preventDefault();
    if (!email.trim()) {
      setError('Please enter the email used at checkout.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/orders/track?ref=${encodeURIComponent(reference)}&email=${encodeURIComponent(email.trim().toLowerCase())}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Order not found. Check your reference and email.');
        return;
      }
      setOrder(data.order);
      setItems(data.items || []);
      // Remember the email for this ref so the next page load is one-click.
      try { localStorage.setItem(`orderEmail:${reference}`, email.trim().toLowerCase()); } catch { /* ignore */ }
    } catch (err) {
      logger.error('Failed to load order', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount if email was already known (from URL or localStorage).
  useEffect(() => {
    if (email) fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  if (!order) {
    return (
      <Layout headerVariant="solid">
        <div className="pt-[100px] min-h-screen bg-gray-50/50 pb-20">
          <div className="max-w-[600px] mx-auto px-5 md:px-8">
            <button
              onClick={() => navigate('/track-order')}
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-text-light hover:text-text mb-8"
            >
              <ChevronLeft size={14} /> Track Another Order
            </button>

            <div className="bg-white border border-gray-100 rounded-sm p-8">
              <h1 className="text-xl font-bold mb-2">View Order</h1>
              <p className="text-sm text-gray-600 mb-6">
                Reference: <span className="font-mono font-bold">{reference}</span>
              </p>
              <form onSubmit={fetchOrder} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-light mb-2">
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
                      autoFocus
                    />
                  </div>
                </div>
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-black/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'View Order'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout headerVariant="solid">
      <div className="pt-[100px] min-h-screen bg-gray-50/50 pb-20">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8">
          <Link
            to="/track-order"
            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-text-light hover:text-text mb-8"
          >
            <ChevronLeft size={14} /> Track Another Order
          </Link>

          <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                  Order
                </span>
                <h1 className="font-mono text-sm font-bold">{order.reference}</h1>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full w-fit ${
                order.status === 'Paid' ? 'bg-green-50 text-green-600'
                  : order.status === 'Pending' ? 'bg-orange-50 text-orange-600'
                    : 'bg-blue-50 text-blue-600'
              }`}>
                {order.status}
              </span>
            </header>

            {items.length > 0 && (
              <section className="bg-white border border-gray-100 rounded-sm p-6 md:p-8">
                <div className="flex items-center gap-2 mb-6">
                  <Package size={16} strokeWidth={1.5} />
                  <h2 className="text-sm font-bold uppercase tracking-widest">Pieces</h2>
                </div>
                <ul className="divide-y divide-gray-100">
                  {items.map((item, i) => (
                    <li key={i} className="py-4 flex justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">{item.productName || item.name}</p>
                        {item.variantName && item.variantName !== item.productName && (
                          <p className="text-xs text-gray-500">{item.variantName}</p>
                        )}
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium">
                        ₦{(Number(item.unitPrice || item.price || 0) * Number(item.quantity || 1)).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {order.shippingAddress && (
                <section className="bg-white border border-gray-100 rounded-sm p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin size={16} strokeWidth={1.5} />
                    <h2 className="text-sm font-bold uppercase tracking-widest">Delivery</h2>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                    {typeof order.shippingAddress === 'string'
                      ? order.shippingAddress
                      : JSON.stringify(order.shippingAddress, null, 2)}
                  </p>
                </section>
              )}

              <section className="bg-white border border-gray-100 rounded-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard size={16} strokeWidth={1.5} />
                  <h2 className="text-sm font-bold uppercase tracking-widest">Summary</h2>
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between font-bold pt-2 border-t border-gray-100">
                    <dt>Total</dt>
                    <dd>₦{Number(order.totalAmount || 0).toLocaleString()}</dd>
                  </div>
                  {order.paidAt && (
                    <div className="flex justify-between text-gray-500 text-xs">
                      <dt>Paid At</dt>
                      <dd>{new Date(order.paidAt).toLocaleString()}</dd>
                    </div>
                  )}
                </dl>
              </section>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default OrderDetail;
