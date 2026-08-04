import { Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { CartDrawer } from './components/CartDrawer';
import { SearchDrawer } from './components/SearchDrawer';
import { AdminRoute } from './admin/components/AdminRoute';
import { lazyWithRetry } from './utils/lazyWithRetry';

// Code-split: ship the Home page (entry) eagerly, lazy-load the rest.
import { Home } from './pages/Home';

const Shop = lazyWithRetry(() => import('./pages/Shop').then((m) => ({ default: m.Shop })));
const Search = lazyWithRetry(() => import('./pages/Search').then((m) => ({ default: m.Search })));
const Cart = lazyWithRetry(() => import('./pages/Cart').then((m) => ({ default: m.Cart })));
const Checkout = lazyWithRetry(() => import('./pages/Checkout').then((m) => ({ default: m.Checkout })));
const GiftCard = lazyWithRetry(() => import('./pages/GiftCard').then((m) => ({ default: m.GiftCard })));
const PaymentVerify = lazyWithRetry(() => import('./pages/PaymentVerify').then((m) => ({ default: m.PaymentVerify })));
const ProductDetail = lazyWithRetry(() => import('./pages/ProductDetail').then((m) => ({ default: m.ProductDetail })));
const Contact = lazyWithRetry(() => import('./pages/Contact').then((m) => ({ default: m.Contact })));
const OrderDetail = lazyWithRetry(() => import('./pages/OrderDetail').then((m) => ({ default: m.OrderDetail })));
const TrackOrder = lazyWithRetry(() => import('./pages/TrackOrder').then((m) => ({ default: m.TrackOrder })));
const NotFound = lazyWithRetry(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));

const Dashboard = lazyWithRetry(() => import('./admin/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const AdminProducts = lazyWithRetry(() => import('./admin/pages/AdminProducts').then((m) => ({ default: m.AdminProducts })));
const AdminOrders = lazyWithRetry(() => import('./admin/pages/AdminOrders').then((m) => ({ default: m.AdminOrders })));
const AdminCustomers = lazyWithRetry(() => import('./admin/pages/AdminCustomers').then((m) => ({ default: m.AdminCustomers })));
const AdminMessages = lazyWithRetry(() => import('./admin/pages/AdminMessages').then((m) => ({ default: m.AdminMessages })));
const AdminSettings = lazyWithRetry(() => import('./admin/pages/AdminSettings').then((m) => ({ default: m.AdminSettings })));
const AdminMarketing = lazyWithRetry(() => import('./admin/pages/AdminMarketing').then((m) => ({ default: m.AdminMarketing })));
const AdminLogin = lazyWithRetry(() => import('./admin/pages/AdminLogin').then((m) => ({ default: m.AdminLogin })));

function PageLoader() {
  return (
    <div className="min-h-screen bg-background" aria-label="Loading page">
      {/* Skeleton header bar */}
      <div className="h-[60px] bg-white border-b border-gray-100 px-6 flex items-center justify-between">
        <div className="h-3 w-20 shimmer-light rounded" />
        <div className="h-8 w-24 shimmer-light rounded" />
        <div className="h-3 w-20 shimmer-light rounded" />
      </div>
      {/* Skeleton hero */}
      <div className="h-[40vh] shimmer-light" />
      {/* Skeleton content grid */}
      <div className="max-w-[1400px] mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[3/4] shimmer-light rounded-lg" />
            <div className="h-3 w-3/4 shimmer-light rounded" />
            <div className="h-3 w-1/2 shimmer-light rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Suspense key={location.pathname} fallback={<PageLoader />}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/search" element={<Search />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/gift-card" element={<GiftCard />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order/:reference" element={<OrderDetail />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="/payment/verify" element={<PaymentVerify />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminRoute><Dashboard /></AdminRoute>} />
          <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
          <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
          <Route path="/admin/messages" element={<AdminRoute><AdminMessages /></AdminRoute>} />
          <Route path="/admin/customers" element={<AdminRoute><AdminCustomers /></AdminRoute>} />
          <Route path="/admin/marketing" element={<AdminRoute><AdminMarketing /></AdminRoute>} />
          <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <UIProvider>
              <AnimatedRoutes />
              {/* Drawers are mounted once at the root so any page (including
                  pages that don't go through Layout) can open them. They sit
                  OUTSIDE the routes so route transitions don't unmount their
                  AnimatePresence state. */}
              <CartDrawer />
              <SearchDrawer />
            </UIProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
