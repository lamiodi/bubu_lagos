import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Settings,
  LogOut,
  Menu,
  Bell,
  Search,
  Package,
  Mail,
  Ticket,
  Gift
} from 'lucide-react';
import { cn, getInitials } from '../../lib/utils';
import { setSessionKind } from '../../utils/api';

function safeReadAdminUser() {
  try {
    return JSON.parse(localStorage.getItem('adminUser') || '{}');
  } catch {
    return {};
  }
}

const NAV_ITEMS = [
  { label: 'Overview', icon: LayoutDashboard, path: '/admin' },
  { label: 'Products', icon: ShoppingBag, path: '/admin/products' },
  { label: 'Orders', icon: Package, path: '/admin/orders' },
  { label: 'Messages', icon: Mail, path: '/admin/messages' },
  { label: 'Customers', icon: Users, path: '/admin/customers' },
  { label: 'Marketing', icon: Ticket, path: '/admin/marketing' },
  { label: 'Settings', icon: Settings, path: '/admin/settings' },
];

const KEYBOARD_SHORTCUTS = {
  'g d': '/admin',
  'g p': '/admin/products',
  'g o': '/admin/orders',
  'g c': '/admin/customers',
  'g m': '/admin/marketing',
  'g s': '/admin/settings',
};

function BreadcrumbsFromPath(pathname) {
  // Admin crumbs: e.g. /admin/orders → ["Overview", "Orders"]
  if (pathname === '/admin') return [{ label: 'Overview', to: '/admin' }];
  const parts = pathname.replace(/^\/admin\/?/, '').split('/');
  const crumbs = [{ label: 'Overview', to: '/admin' }];
  let acc = '/admin';
  for (const p of parts) {
    acc += `/${p}`;
    const item = NAV_ITEMS.find((n) => n.path === acc);
    crumbs.push({ label: item ? item.label : p, to: acc });
  }
  return crumbs;
}

export function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  // [FIX #1] Sidebar: visible on `lg+` by default; can be collapsed into an icon rail.
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [adminUser, setAdminUser] = useState(safeReadAdminUser);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const breadcrumbs = useMemo(() => BreadcrumbsFromPath(location.pathname), [location.pathname]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setSessionKind('customer');
    navigate('/admin/login');
  }, [navigate]);

  // Close notification popover on outside click.
  useEffect(() => {
    if (!notifOpen) return undefined;
    const onClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [notifOpen]);

  // Keyboard shortcuts: `g` then a key within 1s.
  useEffect(() => {
    let lastG = 0;
    const onKey = (e) => {
      if (e.target.matches('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'g' && Date.now() - lastG > 1000) { lastG = Date.now(); return; }
      const combo = `${Date.now() - lastG < 1000 ? 'g ' : ''}${e.key}`;
      const dest = KEYBOARD_SHORTCUTS[combo];
      if (dest) {
        e.preventDefault();
        navigate(dest);
      }
      lastG = 0;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  // Re-read admin user on storage change (e.g. profile update).
  useEffect(() => {
    const onStorage = () => setAdminUser(safeReadAdminUser());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Pending orders badge (for Orders nav item).
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  useEffect(() => {
    // Best-effort; ignore failures. In a real app, subscribe to a websocket or
    // poll the orders endpoint with `status=Pending`.
    let cancelled = false;
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/orders?status=Pending&limit=1`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setPendingOrdersCount(data?.pagination?.total || 0);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [location.pathname]);

  const navItems = NAV_ITEMS.map((item) =>
    item.path === '/admin/orders' ? { ...item, badge: pendingOrdersCount } : item
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transition-all duration-200 ease-in-out lg:relative lg:translate-x-0 flex flex-col",
          // Mobile: slide in/out
          !isSidebarOpen && "-translate-x-full lg:translate-x-0",
          // Desktop: collapse to icon-rail
          isCollapsed ? "lg:w-20" : "lg:w-64",
          isSidebarOpen ? "w-64" : "w-64"
        )}
        aria-label="Admin navigation"
      >
        <div className={cn("h-16 flex items-center border-b border-gray-100", isCollapsed ? "lg:justify-center lg:px-2" : "px-6", "px-6")}>
          <Link to="/admin" className={cn("font-heading font-black tracking-widest", isCollapsed ? "lg:text-base" : "text-2xl")}>
            {isCollapsed ? "B·L" : "BUBU LAGOS"}
          </Link>
        </div>

        <nav className="p-4 space-y-1 flex-1" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.label : undefined}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  "flex items-center gap-3 text-sm font-medium rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none",
                  isCollapsed ? "lg:justify-center lg:px-2 lg:py-3" : "px-4 py-3",
                  isActive
                    ? "bg-black text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-black"
                )}
              >
                <Icon size={20} />
                {!isCollapsed && <span className="flex-1">{item.label}</span>}
                {!isCollapsed && item.badge > 0 && (
                  <span className="text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
                {isCollapsed && item.badge > 0 && (
                  <span className="lg:absolute lg:ml-6 text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* [NEW] Gift card link visible in admin sidebar */}
          <div className={cn("pt-2 mt-2 border-t border-gray-100", isCollapsed && "lg:flex lg:justify-center")}>
            <Link
              to="/gift-card"
              target="_blank"
              rel="noreferrer"
              title={isCollapsed ? 'Gift Card' : undefined}
              className={cn(
                "flex items-center gap-3 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 hover:text-black transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none",
                isCollapsed ? "lg:justify-center lg:px-2 lg:py-3" : "px-4 py-3"
              )}
            >
              <Gift size={20} />
              {!isCollapsed && <span>Public Site · Gift Cards</span>}
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-1">
          <button
            onClick={() => setIsCollapsed((c) => !c)}
            className={cn(
              "hidden lg:flex items-center gap-3 w-full text-sm font-medium text-gray-500 hover:text-black rounded-lg hover:bg-gray-100 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none",
              isCollapsed ? "lg:justify-center lg:px-2 lg:py-3" : "px-4 py-3"
            )}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu size={20} />
            {!isCollapsed && <span>Collapse</span>}
          </button>
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 w-full text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none",
              isCollapsed ? "lg:justify-center lg:px-2 lg:py-3" : "px-4 py-3"
            )}
            title={isCollapsed ? 'Sign Out' : undefined}
          >
            <LogOut size={20} />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 gap-2">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg lg:hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
            aria-label="Toggle sidebar"
          >
            <Menu size={24} />
          </button>

          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="hidden md:flex items-center text-xs text-gray-500 min-w-0">
            {breadcrumbs.map((c, i) => (
              <span key={c.to} className="flex items-center min-w-0">
                {i > 0 && <span className="mx-2 text-gray-300" aria-hidden="true">/</span>}
                {i === breadcrumbs.length - 1 ? (
                  <span className="font-bold text-gray-900 uppercase tracking-widest text-[10px] truncate">{c.label}</span>
                ) : (
                  <Link to={c.to} className="uppercase tracking-widest text-[10px] hover:text-black truncate">{c.label}</Link>
                )}
              </span>
            ))}
          </nav>

          <div className="flex-1 max-w-md ml-auto">
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                const q = e.currentTarget.q.value.trim();
                if (q) navigate(`/admin/products?q=${encodeURIComponent(q)}`);
              }}
            >
              <label htmlFor="admin-global-search" className="sr-only">Search admin</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id="admin-global-search"
                  name="q"
                  type="search"
                  placeholder="Search products, orders, customers…"
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                />
              </div>
            </form>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                aria-label="Notifications"
                aria-expanded={notifOpen}
                onClick={() => setNotifOpen((o) => !o)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-full relative focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
              >
                <Bell size={20} />
                {pendingOrdersCount > 0 && (
                  <span
                    className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 rounded-full border-2 border-white text-[9px] font-bold text-white flex items-center justify-center"
                    aria-hidden="true"
                  >
                    {pendingOrdersCount > 9 ? '9+' : pendingOrdersCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-sm font-bold">Notifications</h3>
                    {pendingOrdersCount > 0 && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">
                        {pendingOrdersCount} pending
                      </span>
                    )}
                  </div>
                  <div className="p-4 text-xs text-gray-500">
                    {pendingOrdersCount > 0 ? (
                      <Link
                        to="/admin/orders?status=Pending"
                        onClick={() => setNotifOpen(false)}
                        className="block p-3 -m-3 rounded-md hover:bg-gray-50"
                      >
                        {pendingOrdersCount} order{pendingOrdersCount !== 1 ? 's' : ''} awaiting fulfilment
                      </Link>
                    ) : (
                      <p className="text-center py-6">All caught up.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div
              className="h-8 w-8 bg-black rounded-full flex items-center justify-center text-white font-bold text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
              title={adminUser.username || 'Admin'}
              aria-label={`Signed in as ${adminUser.username || 'Admin'}`}
              role="img"
              tabIndex={0}
            >
              {getInitials(adminUser.username, 'AD')}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
