import { Layout } from '../components/Layout';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useState } from 'react';
import api from '../utils/api';
import { X } from 'lucide-react';
import { logger } from '../lib/logger';
import { motion, useReducedMotion } from 'framer-motion';

export function Checkout() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const toast = useToast();
  const reduceMotion = useReducedMotion();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    subscribeNewsletter: false
  });
  const [giftCardCode, setGiftCardCode] = useState('');
  const [appliedGiftCard, setAppliedGiftCard] = useState(null);
  const [isValidatingGC, setIsValidatingGC] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleApplyGiftCard = async () => {
    if (!giftCardCode.trim()) return;
    
    setIsValidatingGC(true);
    try {
      const data = await api.get(`/gift-cards/validate/${giftCardCode}`);
      if (data.valid) {
        setAppliedGiftCard({
          code: giftCardCode,
          balance: data.giftCard.currentBalance,
          masked: data.giftCard.codeMasked
        });
        toast.success(`Gift card applied: ₦${data.giftCard.currentBalance.toLocaleString()}`);
        setGiftCardCode('');
      }
    } catch (err) {
      toast.error(err.message || 'Invalid gift card code');
    } finally {
      setIsValidatingGC(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setIsValidatingCoupon(true);
    try {
      const data = await api.post('/coupons/validate', { 
        code: couponCode, 
        cartTotal: cartTotal 
      });
      if (data.valid) {
        setAppliedCoupon(data.coupon);
        toast.success(`Coupon applied: -₦${data.coupon.discountAmount.toLocaleString()}`);
        setCouponCode('');
      }
    } catch (err) {
      toast.error(err.message || 'Invalid or expired coupon code');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const couponDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const totalAfterCoupon = cartTotal - couponDiscount;
  const giftCardDiscount = appliedGiftCard ? Math.min(appliedGiftCard.balance, totalAfterCoupon) : 0;
  const finalTotal = cartTotal - couponDiscount - giftCardDiscount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);

    try {
      const orderData = {
        customerName: `${formData.firstName} ${formData.lastName}`,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        shippingAddress: {
          address: formData.address,
          apartment: formData.apartment,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode
        },
        items: cartItems.map(item => ({
          variantId: item.variantId,
          quantity: item.quantity
        })),
        totalAmount: cartTotal,
        subscribeNewsletter: formData.subscribeNewsletter,
        giftCardCode: appliedGiftCard ? appliedGiftCard.code : null,
        couponCode: appliedCoupon ? appliedCoupon.code : null
      };

      const response = await api.post('/orders', orderData);

      if (response.payment && response.payment.authorizationUrl) {
        // Stash the email so the post-Paystack return (PaymentVerify)
        // can pass it as the 2nd factor to /orders/verify/:reference.
        // We key the email cache by reference so a single typo doesn't
        // bleed into a later order. Cleared on PaymentVerify success.
        localStorage.setItem('pendingOrder', JSON.stringify({
          reference: response.order.reference,
          orderId: response.order.id,
          email: orderData.customerEmail
        }));
        localStorage.setItem('checkoutEmail', orderData.customerEmail);
        // Also stash per-reference so OrderDetail can re-use it later.
        try {
          localStorage.setItem(
            `orderEmail:${response.order.reference}`,
            orderData.customerEmail.toLowerCase()
          );
        } catch { /* ignore */ }

        window.location.href = response.payment.authorizationUrl;
      } else {
        toast.success(response.message || 'Order placed successfully!');
        clearCart();
        navigate(`/payment/verify?reference=${response.order.reference}&email=${encodeURIComponent(orderData.customerEmail)}`);
      }
    } catch (err) {
      logger.error('Order submission error:', err);
      toast.error(err.message || 'Failed to process order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <Layout headerVariant="solid">
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Your selection is empty</h1>
          <Link to="/shop" className="underline uppercase tracking-widest text-xs font-bold">Shop the Collection</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout headerVariant="solid">
      <div className="container mx-auto px-4 py-12 md:py-20 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
          
          <div className="flex-1">
            <motion.h1
              className="text-2xl font-heading font-black uppercase tracking-widest mb-8"
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              Checkout
            </motion.h1>

            <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold uppercase tracking-wider">Contact Information</h2>
                </div>
                <div className="flex flex-col gap-4">
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    className="w-full p-3 border border-gray-300 focus:border-black outline-none" 
                    required 
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      name="subscribeNewsletter"
                      className="accent-black" 
                      checked={formData.subscribeNewsletter}
                      onChange={handleInputChange}
                    />
                    Email me with news and offers
                  </label>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-bold uppercase tracking-wider mb-4">Shipping Address</h2>
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4">
                    <input 
                      type="text" 
                      name="firstName"
                      placeholder="First name" 
                      className="w-1/2 p-3 border border-gray-300 focus:border-black outline-none" 
                      required 
                      value={formData.firstName}
                      onChange={handleInputChange}
                    />
                    <input 
                      type="text" 
                      name="lastName"
                      placeholder="Last name" 
                      className="w-1/2 p-3 border border-gray-300 focus:border-black outline-none" 
                      required 
                      value={formData.lastName}
                      onChange={handleInputChange}
                    />
                  </div>
                  <input 
                    type="text" 
                    name="address"
                    placeholder="Address" 
                    className="w-full p-3 border border-gray-300 focus:border-black outline-none" 
                    required 
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                  <input 
                    type="text" 
                    name="apartment"
                    placeholder="Apartment, suite, etc. (optional)" 
                    className="w-full p-3 border border-gray-300 focus:border-black outline-none" 
                    value={formData.apartment}
                    onChange={handleInputChange}
                  />
                  <div className="flex gap-4">
                    <input 
                      type="text" 
                      name="city"
                      placeholder="City" 
                      className="w-1/3 p-3 border border-gray-300 focus:border-black outline-none" 
                      required 
                      value={formData.city}
                      onChange={handleInputChange}
                    />
                    <input 
                      type="text" 
                      name="state"
                      placeholder="State" 
                      className="w-1/3 p-3 border border-gray-300 focus:border-black outline-none" 
                      required 
                      value={formData.state}
                      onChange={handleInputChange}
                    />
                    <input 
                      type="text" 
                      name="zipCode"
                      placeholder="ZIP code" 
                      className="w-1/3 p-3 border border-gray-300 focus:border-black outline-none" 
                      required 
                      value={formData.zipCode}
                      onChange={handleInputChange}
                    />
                  </div>
                  <input 
                    type="tel" 
                    name="phone"
                    placeholder="Phone" 
                    className="w-full p-3 border border-gray-300 focus:border-black outline-none" 
                    required 
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
              </section>

              <section>
                <h2 className="text-lg font-bold uppercase tracking-wider mb-4">Shipping Method</h2>
                <div className="p-4 border border-gray-300 bg-gray-50 text-sm text-gray-500">
                  Standard Shipping (Free)
                </div>
              </section>

              <section>
                <h2 className="text-lg font-bold uppercase tracking-wider mb-4">Payment</h2>
                <div className="p-4 border border-gray-300 bg-gray-50 text-sm text-gray-600">
                  <p className="font-medium mb-1">Pay with Paystack</p>
                  <p className="text-gray-500">You will be redirected to Paystack to complete your payment securely.</p>
                </div>
              </section>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-4 bg-black text-white font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors mt-4 disabled:bg-gray-400 disabled:cursor-not-allowed lg:hidden"
              >
                {isSubmitting ? 'Processing...' : `Pay ₦${finalTotal.toLocaleString()}`}
              </button>
            </form>
          </div>

          <motion.div
            className="lg:w-[400px] bg-gray-50 p-8 h-fit lg:sticky lg:top-24"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex flex-col gap-6 mb-8">
              {cartItems.map((item) => (
                <div key={`${item.id}-${item.size}`} className="flex gap-4">
                  <div className="relative w-16 h-20 bg-white border border-gray-200">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-black text-white text-xs flex items-center justify-center rounded-full">{item.quantity}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm">{item.name}</h4>
                    <p className="text-xs text-gray-500">{item.size}</p>
                  </div>
                  <span className="text-sm font-medium">{item.price}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-6 mt-6 flex flex-col gap-4">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Coupon code" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 p-3 border border-gray-300 focus:border-black outline-none text-sm bg-white" 
                  />
                  <button 
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isValidatingCoupon || !couponCode}
                    className="px-4 py-2 bg-gray-200 text-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                  >
                    {isValidatingCoupon ? '...' : 'Apply'}
                  </button>
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Gift card" 
                    value={giftCardCode}
                    onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                    className="flex-1 p-3 border border-gray-300 focus:border-black outline-none text-sm bg-white" 
                  />
                  <button 
                    type="button"
                    onClick={handleApplyGiftCard}
                    disabled={isValidatingGC || !giftCardCode}
                    className="px-4 py-2 bg-gray-200 text-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                  >
                    {isValidatingGC ? '...' : 'Apply'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {appliedCoupon && (
                  <div className="flex justify-between items-center text-xs py-2 px-3 bg-blue-50 border border-blue-100 rounded text-blue-800">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">Coupon ({appliedCoupon.code})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>-₦{couponDiscount.toLocaleString()}</span>
                      <button 
                        onClick={() => setAppliedCoupon(null)} 
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {appliedGiftCard && (
                  <div className="flex justify-between items-center text-xs py-2 px-3 bg-green-50 border border-green-100 rounded text-green-800">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">Gift Card</span>
                      <span className="opacity-60">{appliedGiftCard.masked}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>-₦{giftCardDiscount.toLocaleString()}</span>
                      <button 
                        onClick={() => setAppliedGiftCard(null)} 
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₦{cartTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="text-xs">Complimentary</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-blue-600 font-medium">
                  <span>Coupon Discount</span>
                  <span>-₦{couponDiscount.toLocaleString()}</span>
                </div>
              )}
              {giftCardDiscount > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Gift Card</span>
                  <span>-₦{giftCardDiscount.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between font-bold text-lg">
              <span>Total</span>
              <div className="flex flex-col items-end">
                <span>₦{finalTotal.toLocaleString()}</span>
                <span className="text-[10px] text-gray-400 font-normal uppercase tracking-wider">NGN</span>
              </div>
            </div>
            
            <motion.button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                className="w-full py-4 bg-black text-white font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors mt-8 disabled:bg-gray-400 disabled:cursor-not-allowed hidden lg:block"
              >
                {isSubmitting ? 'Processing...' : `Pay ₦${finalTotal.toLocaleString()}`}
            </motion.button>
          </motion.div>

        </div>
      </div>
    </Layout>
  );
}
