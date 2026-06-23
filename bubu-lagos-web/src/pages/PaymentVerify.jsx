import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import { logger } from '../lib/logger';
import { motion, useReducedMotion } from 'framer-motion';

export function PaymentVerify() {
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const toast = useToast();
  const [status, setStatus] = useState('verifying');
  const [orderDetails, setOrderDetails] = useState(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const reference = searchParams.get('reference');

    if (!reference) {
      setStatus('error');
      return;
    }

    // The verify endpoint now requires the buyer's email as a 2nd
    // factor (same model as /track-order). We saved it to localStorage
    // when the order was created (Checkout.jsx). If the user landed
    // here cold, the request returns 404 and we drop to the 'error'
    // state with a link to the public tracker.
    const email =
      searchParams.get('email') ||
      (() => {
        try {
          const pending = JSON.parse(localStorage.getItem('pendingOrder') || '{}');
          if (pending.reference === reference && pending.email) return pending.email;
          return localStorage.getItem('checkoutEmail') || '';
        } catch { return ''; }
      })();

    const verifyPayment = async () => {
      try {
        const url = `/orders/verify/${encodeURIComponent(reference)}${email ? `?email=${encodeURIComponent(email)}` : ''}`;
        const response = await api.get(url);

        if (response.success && response.order) {
          setStatus('success');
          setOrderDetails(response.order);
          clearCart();
          localStorage.removeItem('pendingOrder');
          localStorage.removeItem('checkoutEmail');
        } else {
          setStatus('failed');
        }
      } catch (err) {
        logger.error('Payment verification error:', err);
        setStatus('error');
        // Avoid double-toasting for 404 (most common: email not known).
        if (err.status !== 404) {
          toast.error('Payment verification failed. Please contact support.');
        }
      }
    };

    verifyPayment();
  }, [searchParams, clearCart, toast]);

  return (
    <Layout headerVariant="solid">
      <div className="container mx-auto px-4 py-20 max-w-2xl text-center">
        {status === 'verifying' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            <h1 className="text-2xl font-bold">Confirming Your Order…</h1>
            <p className="text-gray-600">One moment while we verify the atelier payment.</p>
          </div>
        )}

        {status === 'success' && (
          <motion.div
            className="flex flex-col items-center gap-6"
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-2">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-heading font-black uppercase tracking-tighter italic">Thank You</h1>
              <p className="text-xl text-gray-600">Your order is on the atelier floor.</p>
            </div>

            <p className="text-gray-500 max-w-md mx-auto">
              A confirmation has been sent to <span className="font-medium text-black">{orderDetails?.customerEmail}</span> with your order details and tracking link.
            </p>
            
            {orderDetails && (
              <div className="bg-white border border-gray-100 shadow-sm p-8 rounded-2xl w-full text-left mt-4">
                <h2 className="font-bold text-sm uppercase tracking-widest text-gray-400 mb-6 border-b border-gray-50 pb-4">Order Summary</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Order Reference</span>
                    <span className="font-mono font-bold bg-gray-50 px-2 py-1 rounded text-sm">{orderDetails.reference}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Amount Paid</span>
                    <span className="font-bold text-lg">₦{orderDetails.totalAmount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Payment Status</span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse"></span>
                      Confirmed
                    </span>
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-50">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">What&apos;s Next</h3>
                   <ul className="space-y-3 text-sm text-gray-600">
                     <li className="flex gap-3">
                       <span className="w-5 h-5 bg-black text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold">1</span>
                       <span>Our atelier will prepare your Bubu pieces for delivery.</span>
                     </li>
                     <li className="flex gap-3">
                       <span className="w-5 h-5 bg-black text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold">2</span>
                        <span>You&apos;ll receive an SMS and email once your package is on its way.</span>
                     </li>
                   </ul>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full max-w-md">
              <Link
                to="/shop"
                className="flex-1 py-4 bg-black text-white font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors text-center"
              >
                Shop the Collection
              </Link>
              <Link
                to="/contact"
                className="flex-1 py-4 border-2 border-black font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors text-center"
              >
                Speak to Concierge
              </Link>
            </div>
          </motion.div>
        )}

        {status === 'failed' && (
          <div className="flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-red-600">Payment Could Not Be Completed</h1>
            <p className="text-gray-600">Please try again, or reach out to our concierge for assistance.</p>

            <div className="flex gap-4 mt-6">
              <Link
                to="/cart"
                className="px-6 py-3 border-2 border-black font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors"
              >
                Return to Your Selection
              </Link>
              <Link
                to="/checkout"
                className="px-6 py-3 bg-black text-white font-bold uppercase tracking-wider hover:bg-gray-900 transition-colors"
              >
                Try Again
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-yellow-600">Verification Error</h1>
             <p className="text-gray-600">We couldn&apos;t confirm your payment. If you were charged, please reach out to our concierge.</p>

            <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full max-w-md">
              <Link
                to="/track-order"
                className="flex-1 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm text-center"
              >
                Track Your Order
              </Link>
              <Link
                to="/"
                className="flex-1 py-3 border-2 border-black font-bold uppercase tracking-widest text-sm text-center"
              >
                Return to the House
              </Link>
              <a
                href="mailto:concierge@bubulagos.com"
                className="flex-1 py-3 border-2 border-black font-bold uppercase tracking-widest text-sm text-center"
              >
                Speak to Concierge
              </a>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
