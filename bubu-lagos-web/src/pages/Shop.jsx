import { Layout } from '../components/Layout';
import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { logger } from '../lib/logger';
import api from '../utils/api';
import { Search, SlidersHorizontal, ChevronDown, X, ArrowRight, Gift, Check, Sparkles } from 'lucide-react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/ProductCardSkeleton';

import { useUI } from '../context/UIContext';

function CategoryTab({ label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative text-[10px] md:text-[11px] uppercase tracking-[0.14em] font-bold px-4 py-2.5 transition-all duration-200 border",
        isActive 
          ? "bg-black text-white border-black shadow-sm" 
          : "bg-white text-text-light border-border hover:border-black hover:text-black"
      )}
    >
      {label}
    </button>
  );
}

function CollectionChip({ collection, isSelected, onToggle }) {
  return (
    <button
      onClick={() => onToggle(collection.slug)}
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] font-semibold px-3 py-1.5 rounded-full transition-all duration-200 border",
        isSelected
          ? "bg-accent text-white border-accent shadow-sm"
          : "bg-background-light text-text-light border-border hover:border-accent/40 hover:text-accent"
      )}
    >
      {isSelected && <Check size={11} strokeWidth={2.5} />}
      <span>{collection.name}</span>
    </button>
  );
}

function EditorialBanner({ category, activeCollections, collectionsList }) {
  const reduceMotion = useReducedMotion();
  
  // Find current collection banner if single collection filter active
  const activeCol = useMemo(() => {
    if (activeCollections.length === 1) {
      return collectionsList.find(c => c.slug === activeCollections[0]);
    }
    return null;
  }, [activeCollections, collectionsList]);

  const title = activeCol 
    ? activeCol.name 
    : category !== 'all' 
    ? `${category.charAt(0).toUpperCase() + category.slice(1)}` 
    : 'Bubu Lagos Boutique';

  const description = activeCol
    ? activeCol.description
    : category !== 'all'
    ? `Explore our signature ${category} silhouettes handcrafted in our Lagos atelier.`
    : 'Modern African luxury womenswear, handcrafted Bubu gowns, crown turbans, and artisan accessories.';

  const bannerUrl = activeCol?.bannerUrl || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1600&h=600&fit=crop&q=80';

  return (
    <motion.header
      className="relative mb-10 md:mb-14 overflow-hidden bg-black text-white min-h-[220px] md:min-h-[300px] flex items-center"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0 z-0 opacity-40">
        <img
          src={bannerUrl}
          alt={title}
          className="w-full h-full object-cover object-center scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 py-10 w-full flex flex-col justify-center">
        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-accent-light mb-2">
          <Sparkles size={12} className="text-accent-light" />
          Bubu Lagos Atelier
        </span>
        <h1 className="font-heading text-[32px] md:text-[48px] lg:text-[60px] font-bold uppercase tracking-[0.01em] leading-[0.95] text-white mb-3">
          {title}
        </h1>
        {description && (
          <p className="text-[12px] md:text-[14px] leading-[1.7] text-white/80 max-w-[620px]">
            {description}
          </p>
        )}
      </div>
    </motion.header>
  );
}

export function Shop() {
  const { openSearch } = useUI();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read category and collection params from URL
  const activeCategory = searchParams.get('category') || 'all';
  const selectedCollections = useMemo(() => {
    const raw = searchParams.getAll('collection');
    if (raw.length === 1 && raw[0].includes(',')) {
      return raw[0].split(',');
    }
    return raw;
  }, [searchParams]);

  const [categories, setCategories] = useState(SAMPLE_CATEGORIES);
  const [collections, setCollections] = useState(SAMPLE_COLLECTIONS);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reduceMotion = useReducedMotion();

  // Price & Sorting
  const [sort, setSort] = useState("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Fetch Categories & Collections from Backend API
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [catRes, colRes] = await Promise.all([
          api.get('/categories').catch(() => null),
          api.get('/collections').catch(() => null)
        ]);
        if (catRes?.categories?.length > 0) setCategories(catRes.categories);
        if (colRes?.collections?.length > 0) setCollections(colRes.collections);
      } catch (err) {
        logger.error('Failed to load categories/collections:', err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch Products based on Category + Collections filters
  useEffect(() => {
    const controller = new AbortController();
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const queryParams = new URLSearchParams();
        if (activeCategory !== 'all') queryParams.append('category', activeCategory);
        if (selectedCollections.length > 0) {
          selectedCollections.forEach(col => queryParams.append('collection', col));
        }
        if (sort) queryParams.append('sort', sort);
        if (minPrice) queryParams.append('minPrice', minPrice);
        if (maxPrice) queryParams.append('maxPrice', maxPrice);

        const data = await api.get(`/products?${queryParams.toString()}`, { signal: controller.signal });
        if (data?.products) {
          setProducts(data.products);
        } else {
          setProducts([]);
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        logger.error('API product fetch failed:', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    return () => controller.abort();
  }, [activeCategory, selectedCollections, sort, minPrice, maxPrice]);

  const handleCategorySelect = (catSlug) => {
    const params = new URLSearchParams(searchParams);
    if (catSlug === 'all') {
      params.delete('category');
    } else {
      params.set('category', catSlug);
    }
    setSearchParams(params);
  };

  const handleCollectionToggle = (colSlug) => {
    const params = new URLSearchParams(searchParams);
    const currentCols = searchParams.getAll('collection');
    
    if (currentCols.includes(colSlug)) {
      const updated = currentCols.filter(c => c !== colSlug);
      params.delete('collection');
      updated.forEach(c => params.append('collection', c));
    } else {
      params.append('collection', colSlug);
    }
    setSearchParams(params);
  };

  const handleClearAll = () => {
    setMinPrice('');
    setMaxPrice('');
    setSearchParams({});
  };

  const hasActiveFilters = activeCategory !== 'all' || selectedCollections.length > 0 || minPrice || maxPrice;

  return (
    <Layout>
      <div className="bg-background min-h-screen pb-24">
        {/* Editorial Banner Header */}
        <EditorialBanner
          category={activeCategory}
          activeCollections={selectedCollections}
          collectionsList={collections}
        />

        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          {/* Controls Bar: Sticky Category Navigation & Collection Filters */}
          <div className="sticky top-[64px] z-30 bg-background/95 backdrop-blur-md border-b border-border py-4 mb-8">
            <div className="flex flex-col gap-4">
              {/* Primary Filter: Categories Tabs */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-light pr-2 hidden sm:inline">
                    Category:
                  </span>
                  <CategoryTab
                    label="All Categories"
                    isActive={activeCategory === 'all'}
                    onClick={() => handleCategorySelect('all')}
                  />
                  {categories.map((cat) => (
                    <CategoryTab
                      key={cat.id || cat.slug}
                      label={cat.name}
                      isActive={activeCategory.toLowerCase() === (cat.slug || cat.name.toLowerCase())}
                      onClick={() => handleCategorySelect(cat.slug || cat.name.toLowerCase())}
                    />
                  ))}
                </div>

                {/* Right side controls: Search & Filters toggle */}
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={openSearch}
                    className="p-2 border border-border hover:border-black transition-colors"
                    aria-label="Open search drawer"
                  >
                    <Search size={16} />
                  </button>
                  <button
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    className="flex items-center gap-2 px-3 py-2 border border-border text-[11px] font-bold uppercase tracking-[0.14em] hover:border-black transition-colors"
                  >
                    <SlidersHorizontal size={14} />
                    <span>Filter & Sort</span>
                    {hasActiveFilters && (
                      <span className="w-2 h-2 rounded-full bg-accent" />
                    )}
                  </button>
                </div>
              </div>

              {/* Secondary Filters: Merchandising Collections Chips */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-light pr-2">
                  Collections:
                </span>
                {collections.map((col) => (
                  <CollectionChip
                    key={col.id || col.slug}
                    collection={col}
                    isSelected={selectedCollections.includes(col.slug)}
                    onToggle={handleCollectionToggle}
                  />
                ))}
                {hasActiveFilters && (
                  <button
                    onClick={handleClearAll}
                    className="text-[10px] uppercase tracking-[0.14em] text-accent font-bold underline ml-auto hover:text-black"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filter Drawer / Expandable Sort Bar */}
          <AnimatePresence>
            {showMobileFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-border mb-8 bg-background-light p-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-text mb-2">
                      Sort By
                    </label>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="w-full p-2.5 bg-white border border-border text-[12px] uppercase tracking-wider focus:outline-none focus:border-black"
                    >
                      <option value="newest">Newest Arrivals</option>
                      <option value="price_low">Price: Low to High</option>
                      <option value="price_high">Price: High to Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-text mb-2">
                      Price Range (₦)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min Price"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="w-full p-2.5 bg-white border border-border text-[12px] focus:outline-none focus:border-black"
                      />
                      <span className="text-text-light">-</span>
                      <input
                        type="number"
                        placeholder="Max Price"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="w-full p-2.5 bg-white border border-border text-[12px] focus:outline-none focus:border-black"
                      />
                    </div>
                  </div>

                  <div className="flex items-end gap-3">
                    <button
                      onClick={handleClearAll}
                      className="w-full py-2.5 border border-border text-[11px] uppercase tracking-wider font-bold hover:bg-white transition-colors"
                    >
                      Reset Filters
                    </button>
                    <button
                      onClick={() => setShowMobileFilters(false)}
                      className="w-full py-2.5 bg-black text-white text-[11px] uppercase tracking-wider font-bold hover:bg-accent transition-colors"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Product Grid / Loading / Empty State */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-14">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-red-600 text-sm mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-black text-white text-xs uppercase tracking-widest font-bold"
              >
                Reload Catalog
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-background-light border border-border p-8 max-w-md mx-auto my-10">
              <Sparkles size={24} className="mx-auto text-accent mb-3" />
              <h3 className="font-heading text-xl font-bold uppercase mb-2">No Products Found</h3>
              <p className="text-xs text-text-light mb-6">
                We couldn't find any products matching your active category and collection criteria.
              </p>
              <button
                onClick={handleClearAll}
                className="px-6 py-2.5 bg-black text-white text-xs uppercase tracking-widest font-bold hover:bg-accent transition-colors"
              >
                Explore All Products
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-light">
                  Showing {products.length} {products.length === 1 ? 'Garment' : 'Garments'}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-14">
                {products.map((product, i) => (
                  <ProductCard key={product.id} product={product} delay={i * 0.04} />
                ))}
              </div>
            </div>
          )}

          {/* Luxury Gift Card Feature Banner */}
          <div className="mt-20">
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
              </div>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
