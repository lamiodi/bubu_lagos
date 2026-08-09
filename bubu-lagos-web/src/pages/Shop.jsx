import { Layout } from '../components/Layout';
import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { cn, getImageUrl, FALLBACK_IMAGE } from '../lib/utils';
import { logger } from '../lib/logger';
import api from '../utils/api';
import { Search, Filter, X, ArrowRight, Gift, Check, Sparkles, SlidersHorizontal } from 'lucide-react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/ProductCardSkeleton';
import { useUI } from '../context/UIContext';

function CategoryTab({ label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative text-[10px] md:text-[11px] uppercase tracking-[0.14em] font-bold px-4 py-2.5 transition-all duration-200 border rounded-xs",
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

function EditorialBanner({ category, activeCollections, collectionsList, productsList }) {
  const reduceMotion = useReducedMotion();
  
  // Find current collection banner if single collection filter active
  const activeCol = useMemo(() => {
    if (activeCollections.length === 1) {
      return collectionsList.find(c => c.slug === activeCollections[0]);
    }
    return null;
  }, [activeCollections, collectionsList]);

  // Pick dynamic banner background image from random DB products in category or database
  const dynamicBannerImage = useMemo(() => {
    if (activeCol?.bannerUrl) return activeCol.bannerUrl;

    if (category !== 'all' && productsList && productsList.length > 0) {
      const matchingProds = productsList.filter(p => 
        (p.category?.slug || '').toLowerCase() === category.toLowerCase() ||
        (p.category?.name || '').toLowerCase().includes(category.toLowerCase())
      );
      if (matchingProds.length > 0) {
        const randProd = matchingProds[Math.floor(Math.random() * matchingProds.length)];
        const img = getImageUrl(randProd.images?.[0] || randProd.imageUrl);
        if (img) return img;
      }
    }

    if (productsList && productsList.length > 0) {
      const validProds = productsList.filter(p => (p.images && p.images.length > 0) || p.imageUrl);
      if (validProds.length > 0) {
        const randProd = validProds[Math.floor(Math.random() * validProds.length)];
        const img = getImageUrl(randProd.images?.[0] || randProd.imageUrl);
        if (img) return img;
      }
    }

    return FALLBACK_IMAGE;
  }, [activeCol, category, productsList]);

  // Build featured product cards to display on the right side
  const featuredProducts = useMemo(() => {
    if (!productsList || productsList.length === 0) return [];
    
    let selectedProducts = [];

    if (category === 'all') {
      // Pick 1 from each category
      const bubus = productsList.filter(p => p.category?.name === 'Bubus');
      const turbans = productsList.filter(p => p.category?.name === 'Turbans & Gelès');
      const accessories = productsList.filter(p => p.category?.name === 'Artisan Accessories');

      if (bubus.length > 0) selectedProducts.push(bubus[Math.floor(Math.random() * bubus.length)]);
      if (turbans.length > 0) selectedProducts.push(turbans[Math.floor(Math.random() * turbans.length)]);
      if (accessories.length > 0) selectedProducts.push(accessories[Math.floor(Math.random() * accessories.length)]);
      
      // If we don't have exactly 3, fill with random products
      if (selectedProducts.length < 3) {
        const remaining = productsList.filter(p => !selectedProducts.find(s => s.id === p.id));
        selectedProducts = [...selectedProducts, ...remaining].slice(0, 3);
      }
    } else {
      // Pick 3 from the active category
      const categoryProds = productsList.filter(p => 
        (p.category?.slug || '').toLowerCase() === category.toLowerCase() ||
        (p.category?.name || '').toLowerCase().includes(category.toLowerCase())
      );
      selectedProducts = categoryProds.slice(0, 3);
    }

    return selectedProducts.map(prod => ({
      id: prod.id,
      name: prod.name,
      price: prod.basePrice,
      image: getImageUrl(prod.images?.[0] || prod.imageUrl) || FALLBACK_IMAGE,
      url: `/product/${prod.id}`
    }));
  }, [category, productsList]);

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

  return (
    <motion.header
      className="relative mb-10 md:mb-14 overflow-hidden bg-black text-white min-h-[300px] md:min-h-[360px] flex items-center pt-16 md:pt-20"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Background Image Overlay */}
      <div className="absolute inset-0 z-0 opacity-40">
        <img
          src={dynamicBannerImage}
          alt={title}
          className="w-full h-full object-cover object-center scale-105 transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-transparent" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 py-10 w-full flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
        {/* Left Copy Block */}
        <div className="max-w-[620px]">
          <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-accent-light mb-2">
            <Sparkles size={12} className="text-accent-light" />
            Bubu Lagos Atelier
          </span>
          <h1 className="font-heading text-[32px] md:text-[48px] lg:text-[56px] font-bold uppercase tracking-[0.01em] leading-[0.95] text-white mb-3">
            {title}
          </h1>
          {description && (
            <p className="text-[12px] md:text-[14px] leading-[1.7] text-white/80">
              {description}
            </p>
          )}
        </div>

        {/* Right Side Featured Products */}
        {featuredProducts.length > 0 && (
          <div className="w-full lg:w-auto flex items-center gap-3 overflow-x-auto overflow-y-hidden py-3 px-1 scrollbar-none scrollbar-hide">
            {featuredProducts.map(prodCard => (
              <Link
                key={prodCard.id}
                to={prodCard.url}
                className={cn(
                  "group relative flex-shrink-0 w-28 md:w-32 h-36 md:h-40 rounded-xl overflow-hidden border transition-all duration-300 text-left shadow-xl border-white/20 hover:border-white/60 hover:scale-102"
                )}
              >
                <img
                  src={prodCard.image}
                  alt={prodCard.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white line-clamp-1">
                    {prodCard.name}
                  </span>
                  <span className="text-[9px] font-mono text-accent-light">
                    ₦{prodCard.price?.toLocaleString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
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

  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // const reduceMotion = useReducedMotion();

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
          api.get('/categories').catch((err) => {
            logger.error('Failed to load categories:', err);
            return null;
          }),
          api.get('/collections').catch((err) => {
            logger.error('Failed to load collections:', err);
            return null;
          })
        ]);
        setCategories(catRes?.categories || []);
        setCollections(colRes?.collections || []);
      } catch (err) {
        logger.error('Failed to load categories/collections:', err);
        setCategories([]);
        setCollections([]);
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
    <Layout headerVariant="dark">
      <div className="bg-background min-h-screen pb-24">
        {/* Editorial Banner Header */}
        <EditorialBanner
          category={activeCategory}
          activeCollections={selectedCollections}
          collectionsList={collections}
          categoriesList={categories}
          productsList={products}
          onSelectCategory={handleCategorySelect}
        />

        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          {/* Controls Bar: Sticky Category Navigation & Collection Filters */}
          <div className="sticky top-[64px] z-30 bg-background/95 backdrop-blur-md border-b border-border py-4 mb-8">
            <div className="flex flex-col gap-4">
              {/* Primary Filter: Categories Tabs */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto overflow-y-hidden py-1 scrollbar-none scrollbar-hide">
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
                    className="p-2 border border-border hover:border-black transition-colors rounded-xs"
                    aria-label="Open search drawer"
                  >
                    <Search size={16} />
                  </button>
                  <button
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    className="flex items-center gap-2 px-3 py-2 border border-border text-[11px] font-bold uppercase tracking-[0.14em] hover:border-black transition-colors rounded-xs"
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
              </div>
            </div>
          </div>

          {/* Active Filter Pills Bar (Phase 1 Quick Win) */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-background-light border border-border rounded-sm">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-light flex items-center gap-1.5 mr-1">
                <Filter size={12} className="text-accent" /> Active Filters:
              </span>

              {activeCategory !== 'all' && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2.5 py-1 rounded-full">
                  Category: {activeCategory}
                  <button
                    onClick={() => handleCategorySelect('all')}
                    className="hover:text-accent transition-colors ml-0.5"
                    aria-label="Remove category filter"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {selectedCollections.map(colSlug => {
                const colObj = collections.find(c => c.slug === colSlug);
                return (
                  <span key={colSlug} className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-accent text-white px-2.5 py-1 rounded-full">
                    {colObj ? colObj.name : colSlug}
                    <button
                      onClick={() => handleCollectionToggle(colSlug)}
                      className="hover:text-amber-300 transition-colors ml-0.5"
                      aria-label={`Remove ${colSlug} collection filter`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}

              {(minPrice || maxPrice) && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-neutral-800 text-white px-2.5 py-1 rounded-full">
                  Price: ₦{minPrice || '0'} - ₦{maxPrice || '∞'}
                  <button
                    onClick={() => { setMinPrice(''); setMaxPrice(''); }}
                    className="hover:text-amber-300 transition-colors ml-0.5"
                    aria-label="Remove price filter"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              <button
                onClick={handleClearAll}
                className="text-[10px] uppercase tracking-[0.14em] text-accent font-bold underline ml-auto hover:text-black transition-colors"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Filter Drawer / Expandable Sort Bar */}
          <AnimatePresence>
            {showMobileFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-border mb-8 bg-background-light p-6 rounded-sm"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-text mb-2">
                      Sort By
                    </label>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="w-full p-2.5 bg-white border border-border text-[12px] uppercase tracking-wider focus:outline-none focus:border-black rounded-xs"
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
                        className="w-full p-2.5 bg-white border border-border text-[12px] focus:outline-none focus:border-black rounded-xs"
                      />
                      <span className="text-text-light">-</span>
                      <input
                        type="number"
                        placeholder="Max Price"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="w-full p-2.5 bg-white border border-border text-[12px] focus:outline-none focus:border-black rounded-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-end gap-3">
                    <button
                      onClick={handleClearAll}
                      className="btn-secondary w-full py-2.5 text-[11px]"
                    >
                      Reset Filters
                    </button>
                    <button
                      onClick={() => setShowMobileFilters(false)}
                      className="btn-primary w-full py-2.5 text-[11px]"
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
                className="btn-primary px-6 py-2.5 text-xs"
              >
                Reload Catalog
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-background-light border border-border p-8 max-w-md mx-auto my-10 rounded-sm">
              <Sparkles size={24} className="mx-auto text-accent mb-3" />
              <h3 className="text-xl font-bold font-heading uppercase tracking-widest mb-3 text-black">No pieces found</h3>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                Sorry, we couldn&apos;t find any pieces matching your current filters.
              </p>
              <button
                onClick={handleClearAll}
                className="btn-primary px-6 py-2.5 text-xs"
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
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    delay={i * 0.04} 
                    priority={i < 4}
                    allowVideoPreview={i % 4 === 0}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Luxury Gift Card Feature Banner */}
          <div className="mt-20">
            <Link
              to="/gift-card"
              className="group block relative overflow-hidden rounded-2xl bg-black text-white border border-white/10 shadow-2xl transition-all duration-500 hover:border-accent/50"
              aria-label="Send a Bubu Lagos gift card"
            >
              {/* Background Image & Overlay Gradient */}
              <div className="absolute inset-0 z-0 opacity-35">
                <img
                  src={FALLBACK_IMAGE}
                  alt="Luxury Gift Wrapping"
                  className="w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-emerald-950/80" />
              </div>

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-8 md:p-12">
                {/* Left Column */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/20 border border-accent/40 text-accent-light w-fit backdrop-blur-md">
                    <Gift size={13} className="text-accent" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.22em]">
                      Bubu Lagos Digital Voucher
                    </span>
                  </div>

                  <h3 className="font-heading text-[28px] md:text-[38px] lg:text-[46px] font-bold uppercase leading-[1.0] tracking-[0.01em] text-white">
                    Give the Gift of <span className="text-amber-400">Uncompromising Luxury</span>
                  </h3>

                  <p className="text-[12px] md:text-[14px] leading-[1.7] text-white/80 max-w-xl font-sans">
                    Send an instant digital gift card delivered directly via email, or scheduled for a memorable date. Valid site-wide for all handcrafted gowns, turbans, and atelier pieces.
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <span className="btn-accent inline-flex items-center gap-2.5 px-6 py-3.5 text-[11px]">
                      <span>Send a Gift Card</span>
                      <ArrowRight
                        size={15}
                        className="transition-transform duration-300 group-hover:translate-x-1.5"
                      />
                    </span>
                    <span className="text-[11px] font-mono text-white/60 tracking-wider">
                      Available from ₦50,000 – ₦1,000,000
                    </span>
                  </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-5 flex justify-center lg:justify-end">
                  <div className="w-full max-w-[340px] aspect-[1.58/1] rounded-xl bg-gradient-to-br from-neutral-900 via-black to-emerald-950 p-6 flex flex-col justify-between border border-amber-400/30 shadow-2xl relative overflow-hidden group-hover:rotate-1 group-hover:scale-105 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center justify-between z-10">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-amber-400" />
                        <span className="text-[11px] font-heading font-bold uppercase tracking-[0.25em] text-white">
                          BUBU LAGOS
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-bold tracking-widest text-amber-400/90 border border-amber-400/30 px-2 py-0.5 rounded uppercase">
                        ATELIER
                      </span>
                    </div>

                    <div className="my-auto py-2 z-10">
                      <div className="text-[10px] uppercase font-mono tracking-[0.2em] text-white/50 mb-1">
                        E-GIFT CARD
                      </div>
                      <div className="text-2xl font-mono font-bold text-amber-200 tracking-wider">
                        ₦100,000
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/10 z-10 text-[9px] font-mono text-white/50 uppercase tracking-widest">
                      <span>Instant Email Delivery</span>
                      <span>Site-wide Redemption</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
