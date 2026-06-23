import { createContext, useContext, useState, useEffect } from 'react';
import { logger } from '../lib/logger';

const CartContext = createContext({
  cartItems: [],
  addToCart: () => { },
  removeFromCart: () => { },
  updateQuantity: () => { },
  clearCart: () => { },
  cartCount: 0,
  cartTotal: 0
});

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        logger.error('Failed to parse cart from local storage', e);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, variantName) => {
    setCartItems(prev => {
      // Use variantId for identification if available, otherwise fallback to id + size
      const existingItem = prev.find(item =>
        (product.variantId && item.variantId === product.variantId) ||
        (!product.variantId && item.id === product.id && item.size === variantName)
      );

      if (existingItem) {
        return prev.map(item =>
          ((product.variantId && item.variantId === product.variantId) ||
            (!product.variantId && item.id === product.id && item.size === variantName))
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, size: variantName, quantity: 1 }];
    });
  };

  const removeFromCart = (id, size, variantId) => {
    setCartItems(prev => prev.filter(item => {
      if (variantId && item.variantId) return item.variantId !== variantId;
      return !(item.id === id && item.size === size);
    }));
  };

  const updateQuantity = (id, size, change, variantId) => {
    setCartItems(prev => prev.map(item => {
      const isMatch = variantId && item.variantId
        ? item.variantId === variantId
        : (item.id === id && item.size === size);

      if (isMatch) {
        const newQuantity = item.quantity + change;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cartItems.reduce((acc, item) => {
    // Handle both string with currency (₦1,000) and raw numbers
    let price = item.price;
    if (typeof price === 'string') {
      price = parseInt(price.replace(/[^0-9]/g, '')) || 0;
    }
    return acc + (price * item.quantity);
  }, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartCount,
      cartTotal
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
