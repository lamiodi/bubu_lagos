import { Layout } from '../components/Layout';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { logger } from '../lib/logger';
import api from '../utils/api';
import { Search, SlidersHorizontal, ChevronDown, X, ArrowRight, Gift } from 'lucide-react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/ProductCardSkeleton';
import { SAMPLE_CATEGORIES } from '../lib/sampleProducts';
import { useUI } from '../context/UIContext';

const FILTERS = [
  "View All", "New Arrivals", "Signature Bubus", "Occasion Bubus", "Hand-Beaded Pieces",
  "Adire & Heritage Textiles", "Evening", "Resort & Lounge", "Accessories", "Gift Cards"
];

const LOOKBOOK = [
  {
    src: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=900&h=1200&fit=crop",
    alt: "Knitwear Editorial",
    eyebrow: "Knitwear",
    title: "Quiet Texture",
    href: "/shop"
  },
  {
    src: "https://images.unsplash.com/photo-1544957992-20514f595d6f?w=900&h=1200&fit=crop",
    alt: "Outerwear Editorial",
    eyebrow: "Outerwear",
    title: "The Long Coat",
    href: "/shop"
  },
  {
    src: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900&h=1200&fit=crop",
    alt: "Denim Editorial",
    eyebrow: "Denim",
    title: "Indigo Stories",
    href: "/shop"
  }
];

// [MOTION ADDED] Filter chip with shared layoutId indicator (spec: filter chip click → layoutId indicator)
function FilterChip({ filter, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative text-[10px] md:text-[11px] uppercase tracking-[0.14em] font-semibold pb-1 transition-colors duration-200",
        isActive ? "text-text" : "text-text-light hover:text-text"
      )}
    >
      {filter}
      {isActive && (
        <motion.span
          layoutId="filter-underline"
          className="absolute left-0 right-0 -bottom-px h-[1.5px] bg-text"
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
    </button>
  );
}

function CollectionHeader({ eyebrow, title, description, align = 'left' }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.header
      className={cn(
        "mb-8 md:mb-12",
        align === 'center' && "text-center mx-auto"
      )}
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-accent mb-3">
        {eyebrow}
      </span>
      <h2 className="font-heading text-[32px] md:text-[44px] lg:text-[52px] font-bold uppercase tracking-[0.01em] leading-[0.9] mb-3">
        {title}
      </h2>
      {description && (
        <p className={cn(
          "text-[12px] md:text-[13px] leading-[1.7] text-text-light",
          align === 'center' ? "max-w-xl mx-auto" : "max-w-[560px]"
        )}>
          {description}
        </p>
      )}
    </motion.header>
  );
}

function LookbookCard({ item, reduceMotion }) {
  return (
    <Link
      to={item.href}
      className="relative aspect-[3/4] overflow-hidden bg-background-light group block"
    >
      <motion.img
        src={item.src}
        alt={item.alt}
        className="w-full h-full object-cover"
        loading="lazy"
        whileHover={reduceMotion ? undefined : { scale: 1.06 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 flex flex-col gap-1 text-white">
        <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/80">
          {item.eyebrow}
        </span>
        <span className="font-heading text-lg md:text-xl font-bold uppercase tracking-wider leading-tight">
          {item.title}
        </span>
        <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/90 group-hover:text-white transition-colors">
          Shop the Look
          <ArrowRight size={12} strokeWidth={2} className="transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

// [NEW] Featured "Give the gift" tile — links to /gift-card and previews the
// gift card offer. Sits in the Shop page so users discover it without having
// to know about the dedicated /gift-card route.
function GiftCardFeature({ reduceMotion }) {
  return (
    <Link
      to="/gift-card"
      className="group block relative overflow-hidden bg-accent text-white"
      aria-label="Send a Bubu Lagos gift card"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-center px-6 py-8 md:px-10 md:py-10">
        <div className="md:col-span-7 flex flex-col gap-3">
          <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-white/80">
            <Gift size={14} strokeWidth={2} className="text-white" aria-hidden="true" />
            The Gift Card
          </span>
          <h3 className="font-heading text-[26px] md:text-[34px] lg:text-[40px] font-bold uppercase leading-[0.95] tracking-[0.01em]">
            Give the perfect gift
          </h3>
          <p className="text-[12px] md:text-[13px] leading-[1.7] text-white/85 max-w-md">
            Send a Bubu Lagos gift card instantly via email — the ultimate gift of choice. Choose any amount from ₦100,000 to ₦1,000,000.
          </p>
          <span className="mt-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em]">
            Send a Gift Card
            <ArrowRight
              size={14}
              strokeWidth={2}
              className="transition-transform duration-300 group-hover:translate-x-1.5"
              aria-hidden="true"
            />
          </span>
        </div>

        <div className="md:col-span-5 flex md:justify-end">
          <motion.div
            className="relative w-full max-w-[260px] aspect-[5/3] bg-white/10 border border-white/20 backdrop-blur-sm flex flex-col justify-between p-5"
            initial={reduceMotion ? false : { rotate: -2 }}
            whileHover={reduceMotion ? undefined : { rotate: 0, y: -4 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start justify-between">
              <span className="font-heading text-[11px] font-bold tracking-[0.22em] uppercase">
                Bubu Lagos
              </span>
              <span className="text-[9px] font-bold tracking-[0.22em] uppercase text-white/70">
                Gift Card
              </span>
            </div>
            <div>
              <p className="text-[9px] tracking-[0.22em] uppercase text-white/70 mb-1">From</p>
              <p className="font-heading text-[22px] font-bold">₦100,000</p>
            </div>
          </motion.div>
        </div>
      </div>
    </Link>
  );
}

export function Shop() {
  const { openSearch } = useUI();
  const [activeFilter, setActiveFilter] = useState("View All");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reduceMotion = useReducedMotion();

  // Advanced filters state
  const [sort, setSort] = useState("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    fetchCategories();
    const controller = new AbortController();
    fetchProducts(controller.signal);
    return () => controller.abort();
  }, [activeFilter, sort, minPrice, maxPrice]);

  const fetchCategories = async () => {
    try {
      const data = await api.get('/categories');
      setCategories(data.categories || []);
    } catch (err) {
      logger.error('Failed to fetch categories:', err);
      // Fallback to sample categories if API fails
      setCategories(SAMPLE_CATEGORIES);
    }
  };

  const fetchProducts = async (signal) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (activeFilter !== "View All") params.append('category', activeFilter);
      if (sort) params.append('sort', sort);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);

      const data = await api.get(`/products?${params.toString()}`, { signal });
      const list = data.products || [];
      setProducts(list);
    } catch (err) {
      if (err.name === 'AbortError') return;
      logger.error('Failed to fetch products:', err);
      setError('Unable to load products. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceReset = () => {
    setMinPrice("");
    setMaxPrice("");
    fetchProducts();
  };

  const handleClearAll = () => {
    setActiveFilter("View All");
    setMinPrice("");
    setMaxPrice("");
    setSort("newest");
    fetchProducts();
  };

  const displayFilters = categories.length > 0
    ? ["View All", ...categories.map(c => c.name)]
    : FILTERS;

  // [FIX] Group products into editorial sections.
  // Falls back to `category.name` if `collection` is missing so the sections are
  // never silently empty when the data shape is `Atelier 2026` (sample) or
  // absent (admin-created products).
  const collectionOf = (p) =>
    p.collection || p?.category?.name || null;

  const SPRING_LABEL = "Spring 2025";
  const REEDITION_LABEL = "Re-Edition";
  const springProducts = products.filter((p) => collectionOf(p) === SPRING_LABEL);
  const reEditionProducts = products.filter((p) => collectionOf(p) === REEDITION_LABEL);
  const allSectioned = new Set([SPRING_LABEL, REEDITION_LABEL]);
  const uncategorizedProducts = products.filter(
    (p) => !allSectioned.has(collectionOf(p))
  );

  // Show a third "All Products" section only when there's something to show
  // outside the editorial sections, or when the user has an active filter.
  const showAllSection = uncategorizedProducts.length > 0;

  const activeFilterCount = (activeFilter !== "View All" ? 1 : 0) + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0);

  // Shared grid container for all product sections
  const ProductGrid = ({ items }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-14">
      {items.map((product, i) => (
        <ProductCard key={product.id} product={product} delay={i * 0.06} inView={false} />
      ))}
    </div>
  );

  // Shared price filter panel
  const PriceFilterPanel = ({ inMobileSheet = false }) => (
    <div className={cn("space-y-3", inMobileSheet && "")}>
      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text">
        Price Range (₦)
      </h4>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="number"
          placeholder="MIN"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          className="w-24 p-2.5 border border-border text-[11px] uppercase tracking-wider outline-none focus:border-text transition-colors"
        />
        <span className="text-text-light text-xs">—</span>
        <input
          type="number"
          placeholder="MAX"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="w-24 p-2.5 border border-border text-[11px] uppercase tracking-wider outline-none focus:border-text transition-colors"
        />
      </div>
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => { fetchProducts(); if (inMobileSheet) setShowMobileFilters(false); }}
          className="px-5 py-2.5 bg-text text-white text-[10px] uppercase tracking-[0.18em] font-bold hover:bg-black transition-colors"
        >
          Apply
        </button>
        {(minPrice || maxPrice) && (
          <button
            onClick={handlePriceReset}
            className="text-[10px] uppercase tracking-[0.18em] text-text-light hover:text-text transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );

  return (
    <Layout headerVariant="solid">
      <div className="pt-[60px]">
        {/* ============== PAGE HERO ============== */}
        <section className="px-5 md:px-8 pt-10 md:pt-16 pb-8 md:pb-12 max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-end">
            <motion.div
              className="md:col-span-7"
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-accent mb-3">
                The Collection
              </span>
              <h1 className="font-heading text-[42px] md:text-[64px] lg:text-[80px] font-bold uppercase leading-[0.9] tracking-[0.01em]">
                Shop
              </h1>
            </motion.div>
            <motion.div
              className="md:col-span-5 md:pb-3"
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            >
              <p className="text-[12px] md:text-[13px] leading-[1.7] text-text-light max-w-md">
                Discover our universe of contemporary African luxury — heritage textiles, modern silhouettes, and pieces made to outlast the season. Every garment is finished by hand in our Lagos atelier.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ============== GIFT CARD FEATURE TILE ============== */}
        <motion.section
          className="px-5 md:px-8 pb-8 md:pb-12 max-w-[1400px] mx-auto"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        >
          <GiftCardFeature reduceMotion={reduceMotion} />
        </motion.section>

        {/* ============== STICKY FILTER BAR ============== */}
        <nav className="sticky top-[60px] z-40 bg-background/95 backdrop-blur-md border-y border-border">
          {/* Row 1: category chips */}
          <div className="px-5 md:px-8 max-w-[1400px] mx-auto">
            <div className="overflow-x-auto scrollbar-hide">
              <ul className="flex gap-6 md:gap-8 whitespace-nowrap py-4">
                {displayFilters.map((filter) => (
                  <li key={filter}>
                    <FilterChip
                      filter={filter}
                      isActive={activeFilter === filter}
                      onClick={() => setActiveFilter(filter)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Row 2: search / filter / sort — responsive across all viewports */}
          <div className="border-t border-border">
            <div className="px-5 md:px-8 max-w-[1400px] mx-auto">
              {/* Top row: pieces count + primary controls (always visible) */}
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
                <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-none">
                  <span className="text-[10px] md:text-[11px] uppercase tracking-[0.18em] text-text-light whitespace-nowrap">
                    {loading ? 'Loading…' : `${products.length} ${products.length === 1 ? 'Piece' : 'Pieces'}`}
                  </span>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="ml-1 sm:ml-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-text-light hover:text-text transition-colors"
                    >
                      <X size={10} strokeWidth={2.5} />
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 sm:gap-5 md:gap-6 flex-shrink-0">
                  {/* Search — opens the side drawer (no inline form on Shop anymore) */}
                  <button
                    type="button"
                    onClick={openSearch}
                    className="relative inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold hover:text-text-light transition-colors px-1 py-1 -mx-1"
                    aria-label="Open search"
                  >
                    <Search size={12} strokeWidth={2} />
                    <span>Search</span>
                  </button>

                  <button
                    onClick={() => {
                      if (window.innerWidth < 768) setShowMobileFilters(true);
                      else setShowFilters(!showFilters);
                    }}
                    className="relative inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold hover:text-text-light transition-colors px-1 py-1 -mx-1"
                    aria-expanded={showFilters}
                  >
                    <SlidersHorizontal size={12} strokeWidth={2} />
                    <span className="hidden sm:inline">Filter</span>
                    {activeFilterCount > 0 && (
                      <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-accent text-white text-[9px] font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  <div className="relative group">
                    <label className="sr-only" htmlFor="sort-select">Sort by</label>
                    <select
                      id="sort-select"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="appearance-none bg-transparent text-[10px] uppercase tracking-[0.18em] font-semibold pr-4 outline-none cursor-pointer hover:text-text-light transition-colors max-w-[7.5rem] sm:max-w-none"
                    >
                      <option value="newest">Newest</option>
                      <option value="price_low">Price: Low to High</option>
                      <option value="price_high">Price: High to Low</option>
                    </select>
                    <ChevronDown size={10} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop inline filter panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                key="desktop-filters"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden border-t border-border bg-background"
              >
                <div className="px-5 md:px-8 max-w-[1400px] mx-auto py-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    <PriceFilterPanel />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* ============== MOBILE FILTER SHEET ============== */}
        <AnimatePresence>
          {showMobileFilters && (
            <motion.div
              key="mobile-filters-overlay"
              className="fixed inset-0 z-[60] md:hidden"
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setShowMobileFilters(false)}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                className="absolute right-0 top-0 h-full w-[88%] max-w-[380px] bg-white shadow-2xl flex flex-col"
                initial={reduceMotion ? { x: 0 } : { x: '100%' }}
                animate={{ x: 0 }}
                exit={reduceMotion ? { x: 0 } : { x: '100%' }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
                  <span className="font-heading text-sm font-bold tracking-[0.18em]">FILTERS</span>
                  <button
                    className="p-1 -mr-1"
                    onClick={() => setShowMobileFilters(false)}
                    aria-label="Close filters"
                  >
                    <X size={22} strokeWidth={1.5} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text mb-4">
                      Category
                    </h4>
                    <div className="flex flex-col gap-3">
                      {displayFilters.map((filter) => (
                        <button
                          key={filter}
                          onClick={() => { setActiveFilter(filter); setShowMobileFilters(false); }}
                          className={cn(
                            "text-left text-sm font-medium uppercase tracking-wider transition-colors",
                            activeFilter === filter ? "text-accent" : "text-text hover:text-accent"
                          )}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-8 border-t border-border">
                    <PriceFilterPanel inMobileSheet />
                  </div>
                </div>

                <div className="px-6 py-5 border-t border-border flex gap-3">
                  <button
                    onClick={handleClearAll}
                    className="flex-1 py-3 border border-text text-text text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-text hover:text-white transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => { fetchProducts(); setShowMobileFilters(false); }}
                    className="flex-1 py-3 bg-text text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-black transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============== LOADING SKELETON ============== */}
        {loading && (
          <div className="px-5 md:px-8 py-10 md:py-14 max-w-[1400px] mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-14">
              <AnimatePresence>
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={`shop-skel-${i}`} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {error && (
          <div className="min-h-[50vh] flex items-center justify-center px-5">
            <p className="text-[13px] text-red-500">{error}</p>
          </div>
        )}

        {/* ============== PRODUCT SECTIONS ============== */}
        {!loading && !error && (
          <div className="max-w-[1400px] mx-auto">
            {springProducts.length > 0 && (
              <motion.section
                className="px-5 md:px-8 py-12 md:py-20"
                initial={reduceMotion ? false : { opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <CollectionHeader
                  eyebrow="New This Season"
                  title="Spring 2025"
                  description="Celebrating 50 years of Bubu Lagos, with a fresh collection that blends vintage inspiration with contemporary design."
                />
                <ProductGrid items={springProducts} />
              </motion.section>
            )}

            {/* LOOKBOOK EDITORIAL */}
            <motion.section
              className="px-5 md:px-8 py-8 md:py-12"
              initial={reduceMotion ? false : { opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
                {LOOKBOOK.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: index * 0.08 }}
                  >
                    <LookbookCard item={item} reduceMotion={reduceMotion} />
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {reEditionProducts.length > 0 && (
              <motion.section
                className="px-5 md:px-8 py-12 md:py-20"
                initial={reduceMotion ? false : { opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <CollectionHeader
                  eyebrow="Archive"
                  title="Re-Edition™"
                  description="Iconic archive pieces reimagined for today — limited drops, numbered editions."
                />
                <ProductGrid items={reEditionProducts} />
              </motion.section>
            )}

            {showAllSection && (
              <motion.section
                className="px-5 md:px-8 py-12 md:py-20"
                initial={reduceMotion ? false : { opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <CollectionHeader
                  eyebrow={activeFilter !== "View All" ? `Filtered · ${activeFilter}` : "Everything"}
                  title="All Products"
                  description="The full archive — every silhouette we've made, in one place."
                />
                <ProductGrid items={uncategorizedProducts} />
              </motion.section>
            )}

            {products.length === 0 && (
              <div className="min-h-[40vh] flex flex-col items-center justify-center px-5 text-center">
                <p className="text-[13px] uppercase tracking-[0.18em] text-text-light mb-6">
                  No pieces match your current selection.
                </p>
                <button
                  onClick={handleClearAll}
                  className="px-8 py-3 border border-text text-text text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-text hover:text-white transition-colors"
                >
                  View the Full Collection
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
