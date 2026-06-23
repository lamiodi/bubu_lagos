// ===========================================================================
// AuthContext.jsx — guest-checkout edition
//
// The store is now guest-only. There is no customer login, registration,
// profile, or address book. The AuthContext is kept as a tiny stub so
// components that previously called useAuth() (e.g. Header) still
// resolve cleanly. It is intentionally a no-op: isAuthenticated is
// always false, customer is always null, login/logout are stubs that
// do nothing.
//
// Keep this file — removing it would require touching every component
// that imports useAuth, which adds risk for no benefit.
// ===========================================================================

import { createContext, useContext } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Intentionally a constant object — never re-created, never mutates.
  // Calling login()/logout() on this no-op does nothing. New code MUST
  // NOT add a real implementation; the store is guest-checkout only.
  const value = {
    customer: null,
    isLoading: false,
    isAuthenticated: false,
    login: () => {},
    logout: () => {},
    updateCustomer: () => {},
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
