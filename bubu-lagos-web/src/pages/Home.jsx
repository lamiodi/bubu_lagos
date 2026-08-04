import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Layout } from '../components/Layout';
import { getImageUrl, formatProductPrice, FALLBACK_IMAGE, getCloudinaryVideoPoster, getCloudinaryOptimizedVideo } from '../lib/utils';
import { logger } from '../lib/logger';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { AtelierEditSection } from '../components/AtelierEditSection';
import { EASE_OUT } from '../lib/motion';
import { Instagram, ArrowUpRight } from 'lucide-react';

const INSTAGRAM_EDITORIAL_POSTS = [
  {
    id: 1,
    imageUrl: 'https://res.cloudinary.com/dwmz4youk/image/upload/v1785883052/bubu_cta/WhatsApp_Image_2026-08-04_at_11.21.13_PM_3.jpg',
    caption: 'Lagos Couture Sunset · Signature Silk Bubu in Emerald',
    handle: '@bubulagos',
    tag: '#Bubu_Lagos',
    isVideo: false
  },
  {
    id: 2,
    imageUrl: 'https://res.cloudinary.com/dwmz4youk/image/upload/v1785883053/bubu_cta/WhatsApp_Image_2026-08-04_at_11.21.13_PM_4.jpg',
    caption: 'Hand-finished Turban & Gele styling at Admiralty Mall',
    handle: '@bubulagos',
    tag: '#LagosFashion',
    isVideo: false
  },
  {
    id: 3,
    imageUrl: 'https://res.cloudinary.com/dwmz4youk/video/upload/v1785883065/bubu_cta/WhatsApp_Video_2026-08-04_at_11.21.21_PM_1.mp4',
    caption: 'Quiet Luxury Drapes · The Royal Velvet Boubou',
    handle: '@bubulagos',
    tag: '#BubuLagos',
    isVideo: true
  },
  {
    id: 4,
    imageUrl: 'https://res.cloudinary.com/dwmz4youk/image/upload/v1785883054/bubu_cta/WhatsApp_Image_2026-08-04_at_11.21.13_PM_5.jpg',
    caption: 'Atelier Moments · Hand-beaded metallic trims',
    handle: '@bubulagos',
    tag: '#LagosCouture',
    isVideo: false
  }
];

export function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredPostId, setHoveredPostId] = useState(null);
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
      {/* Brand promise banner above the hero grid */}
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
              to="/shop?collection=signature-bubu"
              className="inline-block px-8 py-3.5 border border-black text-black text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-colors"
            >
              Explore Signature Bubu
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Hero section */}
      <section className="pt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
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
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
                    />
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


      {/* THE ATELIER EDIT - Editorial Storytelling Lookbook Section */}
      <AtelierEditSection />

      {/* INSTAGRAM EDITORIAL SHOWCASE (Phase 3) */}
      <motion.section
        className="px-4 sm:px-6 md:px-8 py-16 bg-background-light/40 border-t border-border"
        initial={reduceMotion ? false : { opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="max-w-6xl mx-auto text-center mb-10">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent flex items-center justify-center gap-1.5 mb-2">
            <Instagram size={14} /> Social Proof &amp; Editorial
          </span>
          <h2 className="font-heading text-2xl md:text-4xl font-bold uppercase tracking-widest leading-tight">
            <a
              href="https://www.instagram.com/bubu_lagos?igsh=MWFubXR5MHExNGpvcg=="
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              As Seen On #Bubu_Lagos
            </a>
          </h2>
          <p className="text-xs md:text-sm text-text-light mt-2 max-w-lg mx-auto">
            Tag <a href="https://www.instagram.com/bubu_lagos?igsh=MWFubXR5MHExNGpvcg==" target="_blank" rel="noopener noreferrer" className="underline hover:text-black font-semibold">@bubu_lagos</a> to be featured in our seasonal Lagos couture showcase.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-6xl mx-auto">
          {INSTAGRAM_EDITORIAL_POSTS.map((post) => {
            const isVideo = post.isVideo || post.imageUrl.endsWith('.mp4') || post.imageUrl.includes('/video/upload/');
            const posterSrc = isVideo ? getCloudinaryVideoPoster(post.imageUrl) : post.imageUrl;
            const videoSrc = isVideo ? getCloudinaryOptimizedVideo(post.imageUrl) : null;
            const isHovered = hoveredPostId === post.id;

            return (
              <a
                key={post.id}
                href="https://www.instagram.com/bubu_lagos?igsh=MWFubXR5MHExNGpvcg=="
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="INSTAGRAM"
                onMouseEnter={() => setHoveredPostId(post.id)}
                onMouseLeave={() => setHoveredPostId(null)}
                className="group relative aspect-[3/4] overflow-hidden bg-gray-100 rounded-sm shadow-xs block"
              >
                {isVideo && isHovered ? (
                  <video
                    src={videoSrc}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="none"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                ) : (
                  <img
                    src={posterSrc}
                    alt={post.caption}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                  />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 text-white">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">{post.tag}</span>
                    <ArrowUpRight size={16} />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium leading-snug line-clamp-3 mb-2">{post.caption}</p>
                    <span className="text-[10px] font-mono text-white/70">{post.handle}</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </motion.section>

      {/* Hero-style call-to-action strip with rich media backdrop */}
      <section className="relative px-5 md:px-8 py-20 md:py-28 overflow-hidden bg-black text-white">
        <div className="absolute inset-0 opacity-35 z-0">
          <img
            src="https://res.cloudinary.com/dwmz4youk/image/upload/v1785883048/bubu_cta/WhatsApp_Image_2026-08-04_at_11.21.09_PM.jpg"
            alt="The Bubu Lagos Atelier"
            className="w-full h-full object-cover object-center scale-105"
            onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
        </div>

        <motion.div
          className="relative z-10 max-w-3xl mx-auto text-center"
          initial={reduceMotion ? false : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.h2
            className="font-heading text-3xl md:text-5xl font-bold uppercase tracking-widest leading-[0.9] mb-4 text-white"
            initial={reduceMotion ? false : { opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
          >
            The Bubu Lagos Atelier
          </motion.h2>
          <motion.p
            className="text-sm md:text-base text-white/80 max-w-xl mx-auto mb-8"
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
              className="inline-block px-10 py-4 bg-accent text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-colors shadow-xl"
            >
              Discover the Atelier
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </Layout>
  );
}
