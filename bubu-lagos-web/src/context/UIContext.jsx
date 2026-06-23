import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Global UI state for transient overlay panels (cart drawer, search drawer).
 * Components anywhere in the tree can call `openCart()` / `openSearch()` to
 * pop the relevant drawer without re-rendering the whole page.
 */
const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const openCart = useCallback(() => {
    setSearchOpen(false);
    setCartOpen(true);
  }, []);
  const closeCart = useCallback(() => setCartOpen(false), []);

  const openSearch = useCallback(() => {
    setCartOpen(false);
    setSearchOpen(true);
  }, []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const value = useMemo(
    () => ({
      cartOpen,
      searchOpen,
      openCart,
      closeCart,
      openSearch,
      closeSearch,
    }),
    [cartOpen, searchOpen, openCart, closeCart, openSearch, closeSearch]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within a UIProvider');
  return ctx;
};

export default UIContext;
