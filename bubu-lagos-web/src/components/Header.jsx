import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { X, ShoppingBag } from 'lucide-react';
import { cn } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { EASE_OUT } from '../lib/motion';

const PRIMARY_NAV = [
  { to: '/shop', label: 'New In' },
  { to: '/shop', label: 'E-Shop' },
  { to: '/gift-card', label: 'Gift' },
];

const MOBILE_NAV = [
  { section: 'Atelier', items: [
    { to: '/shop', label: 'New In' },
    { to: '/shop', label: 'E-Shop' },
  ]},
  { section: 'Give', items: [
    { to: '/gift-card', label: 'Gift Card' },
  ]},
  { section: 'Discover', items: [
    { to: '/contact', label: 'Contact Us' },
    { to: '/search', label: 'Search' },
  ]},
];

export function Header({ variant = 'transparent' }) {
  const { cartCount } = useCart();
  const { openCart, openSearch } = useUI();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  // [MOTION ADDED] Scroll-driven bottom border opacity (fades in 0 → 1)
  const { scrollY } = useScroll();
  const borderOpacity = useTransform(scrollY, [0, 80], [0, 1]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        // rAF throttle + passive listener — keeps the page smooth on long scrolls.
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 50);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open + close on ESC
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      const onKey = (e) => { if (e.key === 'Escape') setIsMobileMenuOpen(false); };
      window.addEventListener('keydown', onKey);
      return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
    }
    return undefined;
  }, [isMobileMenuOpen]);

  // Close drawer on route change
  useEffect(() => {
    const close = () => setIsMobileMenuOpen(false);
    window.addEventListener('popstate', close);
    return () => window.removeEventListener('popstate', close);
  }, []);

  // Memoize the derived classes so they don't recompute on every render.
  const headerBg = useMemo(() => {
    if (isScrolled) return 'bg-white shadow-sm';
    if (variant === 'solid') return 'bg-white';
    if (variant === 'dark') return 'bg-transparent';
    return 'bg-white/10 backdrop-blur-md';
  }, [isScrolled, variant]);

  const textColor = useMemo(() => {
    if (isScrolled || variant === 'solid') return 'text-black';
    if (variant === 'dark') return 'text-white';
    return 'text-black';
  }, [isScrolled, variant]);

  const barColor = useMemo(() => {
    if (isScrolled || variant === 'solid') return 'bg-black';
    if (variant === 'dark') return 'bg-white';
    return 'bg-black';
  }, [isScrolled, variant]);

  const navLinkClass = cn(
    "text-[10px] font-bold uppercase tracking-[0.08em] hover:text-accent transition-colors duration-200",
    textColor
  );

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-[60px]",
          headerBg
        )}
      >
        <motion.div
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 h-px bg-black"
          style={{ opacity: reduceMotion ? 1 : borderOpacity }}
        />
        <div className="h-full px-4 sm:px-5 md:px-8 flex items-center justify-between relative">
          {/* Mobile: hamburger */}
          <button
            className="md:hidden flex flex-col gap-[5px] p-2 -ml-2"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <div className={cn("w-[22px] h-[1.5px] transition-colors", barColor)} />
            <div className={cn("w-[16px] h-[1.5px] transition-colors", barColor)} />
            <div className={cn("w-[22px] h-[1.5px] transition-colors", barColor)} />
          </button>

          {/* Desktop: primary nav */}
          <nav className="hidden md:flex items-center gap-5">
            {PRIMARY_NAV.map((item) => (
              <Link key={item.label} to={item.to} className={navLinkClass}>
                {item.label}
              </Link>
            ))}
            <span aria-hidden="true" className={cn("text-[10px] font-bold select-none", textColor)}>——</span>
            <Link to="/contact" className={navLinkClass}>Concierge</Link>
          </nav>

          {/* Centered logo */}
          <Link
            to="/"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center leading-none"
          >
            <div className={cn("font-heading font-black tracking-[0.08em]", textColor)}>
              <span className="block text-[15px] sm:text-[16px] md:text-[18px] leading-[0.85]">BUBU</span>
              <span className="block text-[10px] md:text-[12px] leading-[1] tracking-[0.22em]">LAGOS</span>
            </div>
          </Link>

          {/* Desktop: secondary + account nav */}
          <nav className="hidden md:flex items-center gap-5">
            <button
              type="button"
              onClick={openSearch}
              className={navLinkClass}
              aria-label="Open search"
            >
              Search
            </button>
            <Link
              to="/track-order"
              className={navLinkClass}
            >
              Track Order
            </Link>
            <button
              type="button"
              onClick={openCart}
              className={cn(navLinkClass, "relative inline-flex items-center gap-1.5")}
              aria-label="Open cart"
            >
              <span>Cart</span>
              {cartCount > 0 && (
                <span
                  className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-accent text-white text-[9px] font-bold tabular-nums"
                  aria-hidden="true"
                >
                  {cartCount}
                </span>
              )}
            </button>
          </nav>

          {/* Mobile: right side icons */}
          <div className="flex md:hidden items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={openSearch}
              className={cn("transition-opacity hover:opacity-60", textColor)}
              aria-label="Open search"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
            <button
              type="button"
              onClick={openCart}
              className={cn("transition-opacity hover:opacity-60 relative", textColor)}
              aria-label="Open cart"
            >
              <ShoppingBag size={18} strokeWidth={1.5} />
              {cartCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-2.5 inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 rounded-full bg-accent text-white text-[8.5px] font-bold tabular-nums"
                  aria-hidden="true"
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            key="mobile-menu"
            className="fixed inset-0 z-[60] md:hidden"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              className="absolute top-0 right-0 w-[85%] max-w-[360px] h-full bg-white shadow-2xl flex flex-col"
              initial={reduceMotion ? { x: 0 } : { x: '100%' }}
              animate={{ x: 0 }}
              exit={reduceMotion ? { x: 0 } : { x: '100%' }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
            >
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
                <span className="font-heading text-sm font-bold tracking-[0.15em]">MENU</span>
                <button
                  className="p-1 -mr-1"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <X size={22} strokeWidth={1.5} />
                </button>
              </div>

              <div className="relative h-44 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&h=600&fit=crop&q=80"
                  alt="Bubu Lagos atelier"
                  className="w-full h-full object-cover"
                  // Above-the-fold: eager so the drawer is instant when opened.
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-6 right-6">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-white/80 mb-1">
                    The Atelier
                  </span>
                  <span className="block font-heading text-lg font-bold uppercase tracking-wider text-white leading-tight">
                    Modern African Luxury
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                {MOBILE_NAV.map((section, sIdx) => (
                  <motion.div
                    key={section.section}
                    className={sIdx > 0 ? 'mt-8 pt-6 border-t border-border' : ''}
                    initial={reduceMotion ? false : 'hidden'}
                    animate="show"
                    variants={{
                      hidden: { opacity: 0 },
                      show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 + sIdx * 0.05 } },
                    }}
                  >
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-light mb-4">
                      {section.section}
                    </h3>
                    <nav className="flex flex-col gap-4">
                      {section.items.map((item) => (
                        <motion.div
                          key={item.label}
                          variants={{
                            hidden: { opacity: 0, x: 12 },
                            show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: EASE_OUT } },
                          }}
                        >
                          <Link
                            to={item.to}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="text-base font-medium uppercase tracking-wider text-black hover:text-accent transition-colors"
                          >
                            {item.label}
                          </Link>
                        </motion.div>
                      ))}
                    </nav>
                  </motion.div>
                ))}

                <motion.div
                  className="mt-8 pt-6 border-t border-border"
                  initial={reduceMotion ? false : 'hidden'}
                  animate="show"
                  variants={{
                    hidden: { opacity: 0 },
                    show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.25 } },
                  }}
                >
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-light mb-4">
                    Account
                  </h3>
                  <nav className="flex flex-col gap-4">
                    {[
                      { to: '/track-order', label: 'Track Order' },
                      { to: '/contact', label: 'Contact' },
                    ].map((item) => (
                      <motion.div
                        key={item.label}
                        variants={{
                          hidden: { opacity: 0, x: 12 },
                          show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: EASE_OUT } },
                        }}
                      >
                        <Link
                          to={item.to}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="text-base font-medium uppercase tracking-wider text-black hover:text-accent transition-colors"
                        >
                          {item.label}
                        </Link>
                      </motion.div>
                    ))}
                    <motion.div
                      variants={{
                        hidden: { opacity: 0, x: 12 },
                        show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: EASE_OUT } },
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => { setIsMobileMenuOpen(false); openCart(); }}
                        className="w-full text-base font-medium uppercase tracking-wider text-black hover:text-accent transition-colors text-left flex items-center justify-between"
                      >
                        <span>Cart</span>
                        {cartCount > 0 && (
                          <span
                            className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-accent text-white text-[10px] font-bold tabular-nums"
                            aria-hidden="true"
                          >
                            {cartCount}
                          </span>
                        )}
                      </button>
                    </motion.div>
                  </nav>
                </motion.div>
              </div>

              <div className="px-6 py-5 border-t border-border">
                <Link
                  to="/contact"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full text-center py-3 bg-accent text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-accent-strong transition-colors"
                >
                  Book an Atelier Visit
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
