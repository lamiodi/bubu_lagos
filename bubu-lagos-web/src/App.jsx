import { lazy, Suspense } from 'react';
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

// Code-split: ship the Home page (entry) eagerly, lazy-load the rest.
import { Home } from './pages/Home';

const Shop = lazy(() => import('./pages/Shop').then((m) => ({ default: m.Shop })));
const Search = lazy(() => import('./pages/Search').then((m) => ({ default: m.Search })));
const Cart = lazy(() => import('./pages/Cart').then((m) => ({ default: m.Cart })));
const Checkout = lazy(() => import('./pages/Checkout').then((m) => ({ default: m.Checkout })));
const GiftCard = lazy(() => import('./pages/GiftCard').then((m) => ({ default: m.GiftCard })));
const PaymentVerify = lazy(() => import('./pages/PaymentVerify').then((m) => ({ default: m.PaymentVerify })));
const ProductDetail = lazy(() => import('./pages/ProductDetail').then((m) => ({ default: m.ProductDetail })));
const Contact = lazy(() => import('./pages/Contact').then((m) => ({ default: m.Contact })));
const OrderDetail = lazy(() => import('./pages/OrderDetail').then((m) => ({ default: m.OrderDetail })));
const TrackOrder = lazy(() => import('./pages/TrackOrder').then((m) => ({ default: m.TrackOrder })));
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));

const Dashboard = lazy(() => import('./admin/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const AdminProducts = lazy(() => import('./admin/pages/AdminProducts').then((m) => ({ default: m.AdminProducts })));
const AdminOrders = lazy(() => import('./admin/pages/AdminOrders').then((m) => ({ default: m.AdminOrders })));
const AdminCustomers = lazy(() => import('./admin/pages/AdminCustomers').then((m) => ({ default: m.AdminCustomers })));
const AdminMessages = lazy(() => import('./admin/pages/AdminMessages').then((m) => ({ default: m.AdminMessages })));
const AdminSettings = lazy(() => import('./admin/pages/AdminSettings').then((m) => ({ default: m.AdminSettings })));
const AdminMarketing = lazy(() => import('./admin/pages/AdminMarketing').then((m) => ({ default: m.AdminMarketing })));
const AdminLogin = lazy(() => import('./admin/pages/AdminLogin').then((m) => ({ default: m.AdminLogin })));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" aria-label="Loading page">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
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
