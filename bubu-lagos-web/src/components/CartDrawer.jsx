import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, ArrowRight, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';
import { motion, useReducedMotion } from 'framer-motion';
import { Drawer } from './Drawer';
import { parsePriceValue, formatNGN } from '../lib/utils';

const priceToNumber = (p) => {
  if (typeof p === 'number') return p;
  return parsePriceValue(p) || 0;
};

export function CartDrawer() {
  const { cartItems, removeFromCart, updateQuantity, cartTotal } = useCart();
  const { cartOpen, closeCart, openSearch } = useUI();
  const reduceMotion = useReducedMotion();

  return (
    <Drawer
      open={cartOpen}
      onClose={closeCart}
      title={`Your Selection${cartItems.length > 0 ? ` · ${cartItems.length}` : ''}`}
    >
      {cartItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center px-6 py-16 min-h-[60vh]">
          <ShoppingBag size={36} strokeWidth={1.25} className="text-text-light mb-5" aria-hidden="true" />
          <p className="font-heading text-base font-bold uppercase tracking-wider mb-2">
            Your cart is empty
          </p>
          <p className="text-[12px] text-text-light leading-[1.7] max-w-[280px] mb-7">
            Nothing in here yet. Browse the collection or search for something specific.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-[260px]">
            <Link
              to="/shop"
              onClick={closeCart}
              className="w-full py-3.5 bg-text text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-black transition-colors"
            >
              Shop the Collection
            </Link>
            <button
              type="button"
              onClick={() => { openSearch(); }}
              className="w-full py-3.5 border border-text text-text text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-text hover:text-white transition-colors"
            >
              Search for a Product
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Items */}
          <ul className="flex-1 overflow-y-auto divide-y divide-border">
            {cartItems.map((item, i) => {
              const linePrice = priceToNumber(item.price) * item.quantity;
              const key = `${item.id}-${item.size}-${item.variantId}`;
              return (
                <motion.li
                  key={key}
                  className="flex gap-4 p-5"
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.2) }}
                >
                  <div className="w-20 h-24 bg-gray-100 flex-shrink-0 overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-background-light" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-heading text-[12px] font-bold uppercase tracking-wider leading-tight truncate">
                          {item.name}
                        </h3>
                        {item.size && (
                          <p className="text-[10px] text-text-light mt-1 uppercase tracking-[0.18em]">
                            Size: {item.size}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id, item.size, item.variantId)}
                        aria-label={`Remove ${item.name} from cart`}
                        className="p-1 -mr-1 -mt-1 text-text-light hover:text-text transition-colors"
                      >
                        <X size={16} strokeWidth={1.5} />
                      </button>
                    </div>

                    <div className="mt-auto pt-3 flex items-end justify-between gap-3">
                      <div className="flex items-center border border-border">
                        <button
                          onClick={() => updateQuantity(item.id, item.size, -1, item.variantId)}
                          aria-label="Decrease quantity"
                          className="p-1.5 hover:bg-background-light transition-colors disabled:opacity-50"
                          disabled={item.quantity <= 1}
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-7 text-center text-[11px] font-medium tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.size, 1, item.variantId)}
                          aria-label="Increase quantity"
                          className="p-1.5 hover:bg-background-light transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="font-heading text-[12px] font-bold tabular-nums">
                        {formatNGN(linePrice)}
                      </span>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ul>

          {/* Summary + checkout */}
          <div className="flex-shrink-0 border-t border-border bg-background-light px-5 py-5 space-y-4">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em]">
              <span className="text-text-light">Subtotal</span>
              <span className="font-bold tabular-nums text-text">{formatNGN(cartTotal)}</span>
            </div>
            <p className="text-[10px] text-text-light uppercase tracking-[0.18em]">
              Delivery &amp; taxes calculated at checkout
            </p>
            <Link
              to="/checkout"
              onClick={closeCart}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-text text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-black transition-colors"
            >
              Proceed to Checkout
              <ArrowRight size={14} strokeWidth={2} />
            </Link>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em]">
              <button
                type="button"
                onClick={closeCart}
                className="text-text-light hover:text-text transition-colors"
              >
                Continue the edit
              </button>
              <Link
                to="/cart"
                onClick={closeCart}
                className="text-text-light hover:text-text transition-colors inline-flex items-center gap-1"
              >
                View full selection
                <ArrowRight size={11} strokeWidth={2} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

export default CartDrawer;
