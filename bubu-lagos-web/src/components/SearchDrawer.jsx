import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, ArrowRight } from 'lucide-react';
import api from '../utils/api';
import { logger } from '../lib/logger';
import { useUI } from '../context/UIContext';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { Drawer } from './Drawer';
import { ProductCard } from './ProductCard';


const RECENT_KEY = 'bubu_recent_searches';
const MAX_RECENT = 6;

const QUICK_LINKS = [
  { label: 'Dresses', to: '/shop', category: 'Dresses' },
  { label: 'Knitwear', to: '/shop', category: 'Knitwear' },
  { label: 'Outerwear', to: '/shop', category: 'Outerwear' },
  { label: 'Gift Card', to: '/gift-card' },
];

export function SearchDrawer() {
  const { searchOpen, closeSearch, openCart } = useUI();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const reduceMotion = useReducedMotion();
  const inputRef = useRef(null);

  // Focus the input on open; reset state on close.
  useEffect(() => {
    if (searchOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      // Fetch trending products when drawer opens
      fetchTrending();
      return () => clearTimeout(t);
    }
    setQuery('');
    return undefined;
  }, [searchOpen]);

  const fetchTrending = async () => {
    try {
      const data = await api.get('/products?limit=4');
      setResults(data.products || []);
    } catch (err) {
      logger.error('Failed to fetch trending products:', err);
    }
  };

  // Debounced search
  useEffect(() => {
    if (!searchOpen) return undefined;
    const handle = setTimeout(() => {
      if (query.trim()) {
        fetchResults(query.trim());
      } else {
        setResults([]);
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(handle);
  }, [query, searchOpen]);

  const fetchResults = async (q) => {
    try {
      setLoading(true);
      const data = await api.get(`/products?search=${encodeURIComponent(q)}`);
      const list = data.products || [];
      setResults(list);
    } catch (err) {
      logger.error('Drawer search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const pushRecent = (term) => {
    if (!term) return;
    const next = [term, ...recent.filter((r) => r !== term)].slice(0, MAX_RECENT);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      pushRecent(query.trim());
    }
  };

  const hasQuery = query.trim().length > 0;

  // Filter the displayed quick results to "popular" or matching items.
  // Shows top 4 products when no search query
  const trending = useMemo(() => {
    return results.slice(0, 4);
  }, [results]);

  return (
    <Drawer open={searchOpen} onClose={closeSearch} title="Search">
      <div className="flex flex-col h-full">
        {/* Search input — pinned at the top */}
        <form
          onSubmit={onSubmit}
          className="flex-shrink-0 px-5 md:px-6 pt-5 pb-4 border-b border-border"
        >
          <label htmlFor="drawer-search-input" className="sr-only">Search products</label>
          <div className="relative">
            <Search
              size={14}
              strokeWidth={2}
              className="absolute left-0 top-1/2 -translate-y-1/2 text-text-light pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="drawer-search-input"
              ref={inputRef}
              type="text"
              placeholder="WHAT ARE YOU LOOKING FOR?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-6 pr-8 py-2.5 text-[12px] font-bold uppercase tracking-[0.16em] placeholder:text-text-light placeholder:font-medium border-b border-transparent focus:border-text outline-none bg-transparent"
            />
            {hasQuery && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-text-light hover:text-text transition-colors"
              >
                <X size={14} strokeWidth={2} />
              </button>
            )}
          </div>
        </form>

        {/* Results / suggestions area */}
        <div className="flex-1 overflow-y-auto">
          {!hasQuery ? (
            <div className="px-5 md:px-6 py-6 space-y-8">
              {recent.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-text">
                      Recent
                    </h3>
                    <button
                      type="button"
                      onClick={() => { setRecent([]); try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ } }}
                      className="text-[10px] uppercase tracking-[0.18em] text-text-light hover:text-text transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {recent.map((term) => (
                      <li key={term}>
                        <button
                          type="button"
                          onClick={() => setQuery(term)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] border border-border text-text hover:border-text hover:bg-text hover:text-white transition-colors"
                        >
                          {term}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-text mb-3">
                  Quick Links
                </h3>
                <ul className="grid grid-cols-2 gap-2">
                  {QUICK_LINKS.map((q) => (
                    <li key={q.label}>
                      <Link
                        to={q.to}
                        onClick={closeSearch}
                        className="flex items-center justify-between px-3 py-3 border border-border text-[10px] font-bold uppercase tracking-[0.18em] text-text hover:bg-text hover:text-white transition-colors"
                      >
                        {q.label}
                        <ArrowRight size={11} strokeWidth={2} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-text mb-3">
                  Trending
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {trending.map((product) => (
                    <ProductCard key={product.id} product={product} delay={0} inView={false} />
                  ))}
                </div>
              </section>

              <section className="pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => { closeSearch(); openCart(); }}
                  className="w-full flex items-center justify-between py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-text"
                >
                  View your cart
                  <ArrowRight size={12} strokeWidth={2} />
                </button>
              </section>
            </div>
          ) : (
            <div className="px-5 md:px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase tracking-[0.18em] text-text-light">
                  {loading ? 'Searching…' : `${results.length} ${results.length === 1 ? 'result' : 'results'}`}
                </span>
                <Link
                  to={`/search?q=${encodeURIComponent(query)}`}
                  onClick={() => { pushRecent(query); closeSearch(); }}
                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-text inline-flex items-center gap-1 hover:text-accent transition-colors"
                >
                  See all
                  <ArrowRight size={11} strokeWidth={2} />
                </Link>
              </div>

              {results.length > 0 ? (
                <ul className="grid grid-cols-2 gap-3">
                  <AnimatePresence>
                    {results.slice(0, 8).map((product, i) => (
                      <motion.li
                        key={product.id}
                        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.15) }}
                      >
                        <ProductCard product={product} delay={0} inView={false} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              ) : !loading ? (
                <div className="py-10 text-center">
                  <p className="text-[12px] text-text-light mb-4">
                    No products match &quot;{query}&quot;
                  </p>
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="text-[10px] font-bold uppercase tracking-[0.18em] text-text underline underline-offset-2"
                  >
                    Clear search
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

export default SearchDrawer;
