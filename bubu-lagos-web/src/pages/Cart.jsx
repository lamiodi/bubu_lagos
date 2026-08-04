import { Layout } from '../components/Layout';
import { Link } from 'react-router-dom';
import { Minus, Plus, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { motion, useReducedMotion } from 'framer-motion';

const FREE_SHIPPING_THRESHOLD = 150000;

export function Cart() {
  const { cartItems, removeFromCart, updateQuantity, cartTotal } = useCart();
  const reduceMotion = useReducedMotion();

  const freeShippingProgress = Math.min(100, Math.round((cartTotal / FREE_SHIPPING_THRESHOLD) * 100));
  const amountNeededForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);

  return (
    <Layout headerVariant="solid">
      <div className="container mx-auto px-4 py-12 md:py-20 max-w-6xl">
        {/* Heading entry */}
        <motion.h1
          className="text-3xl md:text-4xl font-heading font-black uppercase tracking-widest mb-12 text-center"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          Your Selection
        </motion.h1>

        {cartItems.length === 0 ? (
          <motion.div
            className="text-center py-12"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-lg mb-3">Your selection is empty.</p>
            <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto">Begin your edit: explore the collection and add a piece to your bag.</p>
            <Link to="/shop" className="btn-primary inline-block px-8 py-4">
              Shop the Collection
            </Link>
          </motion.div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-12">
            {/* Cart Items */}
            <div className="flex-1">
              <div className="border-b border-black pb-4 mb-4 flex justify-between text-xs font-bold uppercase tracking-wider">
                <span>Piece</span>
                <span className="hidden md:block">Quantity</span>
                <span>Total</span>
              </div>

              <div className="flex flex-col gap-8">
                {cartItems.map((item, i) => (
                  <motion.div
                    key={`${item.id}-${item.size}-${item.variantId}`}
                    className="flex gap-4 md:gap-8 border-b border-gray-100 pb-8"
                    initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="w-24 h-32 bg-gray-100 flex-shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <h3 className="font-heading font-bold uppercase tracking-wider">{item.name}</h3>
                        <p className="text-sm text-gray-500">Size: {item.size}</p>
                        <button
                          onClick={() => removeFromCart(item.id, item.size, item.variantId)}
                          className="text-xs underline uppercase tracking-wider text-left mt-2 hover:text-gray-600 w-fit"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="flex items-center justify-between md:justify-center w-full md:w-auto">
                        <div className="flex items-center border border-gray-200">
                          <button
                            onClick={() => updateQuantity(item.id, item.size, -1, item.variantId)}
                            className="p-2 hover:bg-gray-50"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.size, 1, item.variantId)}
                            className="p-2 hover:bg-gray-50"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <span className="md:hidden font-bold">{item.price}</span>
                      </div>

                      <div className="hidden md:block font-bold min-w-[80px] text-right">
                        {parseInt(String(item.price).replace(/[^0-9]/g, ''), 10) * item.quantity
                          ? `₦${(parseInt(String(item.price).replace(/[^0-9]/g, ''), 10) * item.quantity).toLocaleString()}`
                          : item.price}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <motion.div
              className="lg:w-[400px] bg-background-light p-8 h-fit border border-border rounded-sm"
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2 className="font-heading font-bold uppercase tracking-wider mb-6 text-xl">Order Summary</h2>

              {/* Free Shipping Progress Indicator */}
              <div className="bg-white p-4 border border-border rounded-sm mb-6">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1.5 text-accent">
                    <Truck size={15} />
                    {cartTotal >= FREE_SHIPPING_THRESHOLD ? (
                      <span>Free Delivery Unlocked! 🎉</span>
                    ) : (
                      <span>Add ₦{amountNeededForFreeShipping.toLocaleString()} for Free Delivery</span>
                    )}
                  </span>
                  <span className="font-mono text-accent">{freeShippingProgress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-500 rounded-full"
                    style={{ width: `${freeShippingProgress}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4 mb-8">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>₦{cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Delivery</span>
                  <span className="text-gray-500">
                    {cartTotal >= FREE_SHIPPING_THRESHOLD ? (
                      <span className="text-accent font-bold">COMPLIMENTARY</span>
                    ) : (
                      'Calculated at checkout'
                    )}
                  </span>
                </div>
                <div className="border-t border-border pt-4 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>₦{cartTotal.toLocaleString()}</span>
                </div>
              </div>

              <Link
                to="/checkout"
                className="btn-primary block w-full text-center py-4 text-xs font-bold uppercase tracking-widest"
              >
                Proceed to Checkout
              </Link>
            </motion.div>
          </div>
        )}
      </div>
    </Layout>
  );
}
