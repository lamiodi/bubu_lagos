import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Layout } from '../components/Layout';
import { getImageUrl, formatProductPrice } from '../lib/utils';
import { logger } from '../lib/logger';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/ProductCardSkeleton';
import { FALLBACK_IMAGE } from '../lib/sampleProducts';
import { EASE_OUT } from '../lib/motion';

export function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get('/products?limit=4');
      const list = data.products || [];
      setFeaturedProducts(list);
    } catch (err) {
      logger.error('Failed to fetch featured products:', err);
      setError('Unable to load products. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (p) => {
    if (p?.variants?.[0]?.price) return formatProductPrice(p.variants[0].price);
    if (p?.basePrice) return formatProductPrice(p.basePrice);
    return '';
  };

  return (
    <Layout headerVariant="transparent">
      {/* [MOTION ADDED] Brand promise banner above the hero grid */}
      <section className="pt-[80px] pb-4 md:pb-6 px-5 md:px-8 text-center max-w-3xl mx-auto">
        <motion.span
          className="block text-[10px] font-bold uppercase tracking-[0.28em] text-accent mb-3"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.05 }}
        >
          Signature Bubu Atelier
        </motion.span>
        <motion.h1
          className="font-heading text-3xl md:text-5xl lg:text-6xl font-bold uppercase tracking-[0.01em] leading-[0.95] mb-4"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.15 }}
        >
          Modern African elegance, cut for comfort
        </motion.h1>
        <motion.p
          className="text-sm md:text-base text-text-light leading-[1.7] max-w-xl mx-auto mb-6"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.25 }}
        >
          Discover Bubu silhouettes designed for ease, movement, and quiet luxury. Hand-finished in Lagos with refined drape, rich texture, and statement detail.
        </motion.p>
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.35 }}
        >
          <motion.div whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={reduceMotion ? undefined : { scale: 0.96 }}>
            <Link
              to="/shop"
              className="inline-block px-8 py-3.5 bg-black text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-accent transition-colors"
            >
              Shop the Collection
            </Link>
          </motion.div>
          <motion.div whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={reduceMotion ? undefined : { scale: 0.96 }}>
            <Link
              to="/shop?category=Signature%20Bubus"
              className="inline-block px-8 py-3.5 border border-black text-black text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-colors"
            >
              Explore Signature Bubus
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* [MOTION ADDED] Hero section with staggered reveal — real products, name + price on photo */}
      <section className="pt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Error state */}
          {error && !loading && (
            <div className="col-span-full text-center py-12">
              <p className="text-text-light text-sm mb-4">{error}</p>
              <button
                onClick={fetchFeaturedProducts}
                className="px-6 py-2 bg-black text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-accent transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {loading ? (
              // [MOTION ADDED] Skeleton hero tiles while products load
              Array.from({ length: 4 }).map((_, i) => (
                <motion.div
                  key={`hero-skel-${i}`}
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="relative aspect-square overflow-hidden bg-[#e8e4df]"
                >
                  <div
                    className="absolute inset-0 shimmer-light"
                    style={{ transform: 'skewX(-4deg) scale(1.06)' }}
                  />
                </motion.div>
              ))
            ) : (
              featuredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 48 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 + index * 0.08 }}
                >
                  <Link
                    to={`/product/${product.id}`}
                    className="relative aspect-square group overflow-hidden bg-[#e8e4df] cursor-pointer block"
                  >
                    <motion.img
                      src={getImageUrl(product.images?.[0]) || FALLBACK_IMAGE}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading={index < 2 ? "eager" : "lazy"}
                      whileHover={reduceMotion ? undefined : { scale: 1.05 }}
                      transition={{ duration: 0.7, ease: EASE_OUT }}
                      onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                    />
                    {/* [MOTION ADDED] Dark gradient scrim so the caption is always legible */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
                    />
                    {/* [MOTION ADDED] Product name + price caption (staggered) */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 flex flex-col gap-1">
                      <motion.span
                        className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80"
                        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.25 + index * 0.06 }}
                      >
                        {product.category?.name || 'Featured'}
                      </motion.span>
                      <motion.div
                        className="flex items-end justify-between gap-3"
                        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.35 + index * 0.06 }}
                      >
                        <span className="text-white text-sm md:text-base font-heading font-bold uppercase tracking-wider leading-tight line-clamp-2">
                          {product.name}
                        </span>
                        <span className="text-white text-xs md:text-sm font-bold whitespace-nowrap">
                          {formatPrice(product)}
                        </span>
                      </motion.div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* [MOTION ADDED] Scroll-triggered featured products section */}
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="px-4 sm:px-5 md:px-8 py-8 md:py-12"
      >
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6 scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0">
          <AnimatePresence mode="wait">
            {loading && featuredProducts.length === 0 ? (
              // [MOTION ADDED] Render 4 skeletons with the same grid footprint
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="flex-shrink-0 w-[75vw] sm:w-auto snap-start"
                >
                  <ProductCardSkeleton />
                </div>
              ))
            ) : (
              featuredProducts.map((product, i) => (
                <div
                  key={product.id}
                  className="flex-shrink-0 w-[75vw] sm:w-auto snap-start"
                >
                  <ProductCard product={product} delay={i * 0.08} inView={false} />
                </div>
              ))
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* [MOTION ADDED] Hero-style call-to-action strip (preserves existing layout) */}
      <section className="px-5 md:px-8 py-16 md:py-24">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial={reduceMotion ? false : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.h2
            className="font-heading text-3xl md:text-5xl font-bold uppercase tracking-widest leading-[0.9] mb-4"
            initial={reduceMotion ? false : { opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
          >
            The Bubu Lagos Atelier
          </motion.h2>
          <motion.p
            className="text-sm md:text-base text-text-light max-w-xl mx-auto mb-8"
            initial={reduceMotion ? false : { opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.25 }}
          >
            A modern wardrobe shaped by comfort, craftsmanship, and presence. From flowing everyday pieces to occasion statements, each design is made to feel effortless and unforgettable.
          </motion.p>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.4 }}
            whileHover={reduceMotion ? undefined : { y: -2 }}
            whileTap={reduceMotion ? undefined : { scale: 0.96 }}
          >
            <Link
              to="/shop"
              className="inline-block px-10 py-4 bg-black text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-accent transition-colors"
            >
              Discover the Atelier
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </Layout>
  );
}
