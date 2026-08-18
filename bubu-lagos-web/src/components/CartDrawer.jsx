import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, ArrowRight, X, Sparkles, PlusCircle, Check, Truck } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';
import { useToast } from '../context/ToastContext';
import { Drawer } from './Drawer';
import api from '../utils/api';
import { parsePriceValue, formatNGN, getImageUrl, FALLBACK_IMAGE } from '../lib/utils';

const priceToNumber = (p) => {
  if (typeof p === 'number') return p;
  return parsePriceValue(p) || 0;
};

const FREE_SHIPPING_THRESHOLD = 150000;

export function CartDrawer() {
  const { cartItems, removeFromCart, updateQuantity, cartTotal, addToCart } = useCart();
  const { cartOpen, closeCart, openSearch } = useUI();
  const toast = useToast();
  const reduceMotion = useReducedMotion();
  const [smartProducts, setSmartProducts] = useState([]);
  const [addedItemIds, setAddedItemIds] = useState({});

  useEffect(() => {
    if (cartOpen) {
      if (cartItems.length > 0) {
        const firstItem = cartItems[0];
        api.get(`/products/recommendations?productId=${firstItem.id}&targetCategory=turbans-geles&limit=3`)
          .then(res => {
            if (res.products && res.products.length > 0) {
              setSmartProducts(res.products);
            } else {
              api.get('/products?limit=3').then(r => setSmartProducts(r.products || []));
            }
          })
          .catch(() => {
            api.get('/products?limit=3').then(r => setSmartProducts(r.products || []));
          });
      } else {
        // Fetch popular pieces for empty cart state smart selection
        api.get('/products?limit=3')
          .then(r => setSmartProducts(r.products || []))
          .catch(() => {});
      }
    }
  }, [cartItems, cartOpen]);

  const handleQuickAdd = (product) => {
    const img = product.images && product.images.length > 0 ? getImageUrl(product.images[0]) : FALLBACK_IMAGE;
    const defaultVariant = product.variants?.[0];
    const price = defaultVariant?.price ?? product.basePrice;
    addToCart({
      id: product.id,
      name: product.name,
      price: price,
      image: img,
      variantId: defaultVariant?.id || null
    }, defaultVariant?.name || 'Default');

    toast.success(`Added ${product.name} to selection`);
    setAddedItemIds(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedItemIds(prev => ({ ...prev, [product.id]: false }));
    }, 1500);
  };

  const freeShippingProgress = Math.min(100, Math.round((cartTotal / FREE_SHIPPING_THRESHOLD) * 100));
  const amountNeededForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);

  return (
    <Drawer
      open={cartOpen}
      onClose={closeCart}
      title={`Your Selection${cartItems.length > 0 ? ` · ${cartItems.length}` : ''}`}
    >
      {cartItems.length === 0 ? (
        <div className="flex flex-col h-full justify-between overflow-y-auto">
          <div className="flex flex-col items-center justify-center text-center px-6 py-10 my-auto">
            <ShoppingBag size={40} strokeWidth={1.25} className="text-accent mb-4" aria-hidden="true" />
            <h3 className="font-heading text-base font-bold uppercase tracking-wider mb-2">
              Your selection is empty
            </h3>
            <p className="text-[12px] text-text-light leading-[1.7] max-w-[280px] mb-6">
              Begin your edit — explore recommended atelier pieces below or browse the full collection.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-[320px] mb-6">
              <Link
                to="/shop"
                onClick={closeCart}
                className="btn-primary text-[10px] py-3 flex-1 text-center"
              >
                Shop Collection
              </Link>
              <button
                type="button"
                onClick={() => { openSearch(); }}
                className="btn-secondary text-[10px] py-3 flex-1"
              >
                Search
              </button>
            </div>
          </div>

          {/* Smart Product Selection inside Empty State */}
          {smartProducts.length > 0 && (
            <div className="bg-background-light p-4 border-t border-border mt-auto">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text flex items-center gap-1.5">
                  <Sparkles size={12} className="text-accent" />
                  Recommended Atelier Pieces
                </span>
                <span className="badge-accent text-[9px]">Smart Selection</span>
              </div>
              <div className="space-y-2">
                {smartProducts.slice(0, 3).map(prod => {
                  const img = prod.images && prod.images.length > 0 ? getImageUrl(prod.images[0]) : FALLBACK_IMAGE;
                  const isAdded = addedItemIds[prod.id];
                  return (
                    <div key={prod.id} className="bg-white p-2.5 border border-border flex items-center gap-3 rounded-sm shadow-xs transition-all hover:border-black/20">
                      <div className="w-12 h-14 bg-gray-100 flex-shrink-0 overflow-hidden rounded-xs">
                        <img src={img} alt={prod.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider truncate text-text">{prod.name}</p>
                        <p className="text-[10px] text-text-light font-medium">{formatNGN(prod.basePrice)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(prod)}
                        disabled={isAdded}
                        className="btn-accent text-[9px] py-1.5 px-3 whitespace-nowrap"
                      >
                        {isAdded ? (
                          <>
                            <Check size={11} /> Added
                          </>
                        ) : (
                          <>
                            <PlusCircle size={11} /> + Add
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Free Shipping Progress Indicator */}
          <div className="bg-emerald-950/5 border-b border-emerald-900/10 px-5 py-3 text-xs shrink-0">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1.5">
              <span className="flex items-center gap-1.5 text-accent font-semibold">
                <Truck size={13} className="text-accent" />
                {cartTotal >= FREE_SHIPPING_THRESHOLD ? (
                  <span>Complimentary Delivery Unlocked! 🎉</span>
                ) : (
                  <span>Add {formatNGN(amountNeededForFreeShipping)} for Free Lagos Delivery</span>
                )}
              </span>
              <span className="font-mono text-accent font-bold">{freeShippingProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-emerald-950/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-500 rounded-full"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>

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
                  <div className="w-20 h-24 bg-gray-100 flex-shrink-0 overflow-hidden rounded-xs border border-black/5">
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
                      <div className="flex items-center border border-border rounded-xs">
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

          {/* Smart Product Selection / Pairings */}
          {smartProducts.length > 0 && (
            <div className="bg-background-light p-4 border-t border-border">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text flex items-center gap-1.5 font-serif">
                  <Sparkles size={12} className="text-accent" />
                  Smart Selection · Complete Your Edit
                </span>
                <span className="badge-accent text-[8px]">Curated</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {smartProducts.slice(0, 2).map(product => {
                  const img = product.images && product.images.length > 0 ? getImageUrl(product.images[0]) : FALLBACK_IMAGE;
                  const isAdded = addedItemIds[product.id];
                  return (
                    <div key={product.id} className="bg-white p-2 border border-border flex items-center gap-2 rounded-sm shadow-xs transition-all hover:border-black/20">
                      <div className="w-10 h-12 bg-gray-100 flex-shrink-0 overflow-hidden rounded-xs">
                        <img src={img} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-wider truncate text-text">{product.name}</p>
                        <p className="text-[9px] text-text-light">{formatNGN(product.basePrice)}</p>
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(product)}
                          disabled={isAdded}
                          className="text-[8px] font-bold uppercase tracking-wider text-accent hover:underline mt-0.5 inline-flex items-center gap-1"
                        >
                          {isAdded ? (
                            <span className="text-emerald-700 font-extrabold flex items-center gap-0.5"><Check size={9} /> Added</span>
                          ) : (
                            <span>+ Add Piece</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary + checkout */}
          <div className="flex-shrink-0 border-t border-border bg-background-light px-5 py-5 space-y-4">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em]">
              <span className="text-text-light font-medium">Subtotal</span>
              <span className="font-bold tabular-nums text-text text-sm">{formatNGN(cartTotal)}</span>
            </div>
            <p className="text-[10px] text-text-light uppercase tracking-[0.18em]">
              Delivery &amp; taxes calculated at checkout
            </p>
            <Link
              to="/checkout"
              onClick={closeCart}
              className="btn-primary w-full py-3.5"
            >
              Proceed to Checkout
              <ArrowRight size={14} strokeWidth={2} />
            </Link>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] pt-1">
              <button
                type="button"
                onClick={closeCart}
                className="text-text-light hover:text-accent font-semibold transition-colors"
              >
                Continue the edit
              </button>
              <Link
                to="/cart"
                onClick={closeCart}
                className="text-text-light hover:text-accent font-semibold transition-colors inline-flex items-center gap-1"
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
