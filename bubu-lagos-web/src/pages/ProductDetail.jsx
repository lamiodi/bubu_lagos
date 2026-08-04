import { Layout } from '../components/Layout';
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { cn, getImageUrl, formatProductPrice, FALLBACK_IMAGE } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import { logger } from '../lib/logger';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ProductCard } from '../components/ProductCard';
import { ChevronUp, ChevronDown, Sparkles } from 'lucide-react';

import { ProductDetailSkeleton } from '../components/Skeleton';
import { SizeGuideModal } from '../components/SizeGuideModal';
import GarmentCare from '../components/GarmentCare';

export function ProductDetail() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const toast = useToast();
  const reduceMotion = useReducedMotion();
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [product, setProduct] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [otherColors, setOtherColors] = useState([]);
  const [turbanProducts, setTurbanProducts] = useState([]);
  const [justAdded, setJustAdded] = useState(false);
  const [activeTab, setActiveTab] = useState('photos'); // 'photos' | 'video'
  const [mobileActiveImage, setMobileActiveImage] = useState(0);
  const mobileGalleryRef = useRef(null);

  const handleMobileScroll = () => {
    if (!mobileGalleryRef.current) return;
    const container = mobileGalleryRef.current;
    const scrollTop = container.scrollTop;
    const height = container.clientHeight;
    if (height > 0) {
      const index = Math.round(scrollTop / height);
      if (index !== mobileActiveImage && index >= 0) {
        setMobileActiveImage(index);
      }
    }
  };

  const scrollToMobileImage = (index) => {
    if (!mobileGalleryRef.current) return;
    const container = mobileGalleryRef.current;
    const height = container.clientHeight;
    container.scrollTo({
      top: index * height,
      behavior: 'smooth'
    });
    setMobileActiveImage(index);
  };

  useEffect(() => {
    fetchProductDetails();
    window.scrollTo(0, 0);
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get(`/products/${id}`);
      setProduct(data);
      if (data.variants && data.variants.length > 0) {
        setSelectedVariant(data.variants[0]);
      }
      fetchRecommendations(data);
    } catch (err) {
      logger.error('Failed to fetch product:', err);
      setError('Product not found or unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async (productData) => {
    try {
      // 1. Fetch smart color-matched or admin-suggested matching Turbans & Gelès for "Complete the Look"
      const turbanRes = await api.get(`/products/recommendations?productId=${productData.id}&targetCategory=turbans-geles&limit=3`);
      if (turbanRes.products && turbanRes.products.length > 0) {
        setTurbanProducts(turbanRes.products);
      }

      // 2. Fetch general related pieces
      if (productData.category?.name) {
        const catRes = await api.get(`/products?category=${encodeURIComponent(productData.category.name)}&limit=15`);
        let sameCat = catRes.products || [];
        sameCat = sameCat.filter(p => p.id !== productData.id);
        
        const baseName = productData.name.split('-')[0].trim().split(' ')[0];
        const colors = sameCat.filter(p => p.name.includes(baseName));
        setOtherColors(colors.slice(0, 4));
        
        const related = sameCat.filter(p => !colors.includes(p));
        setRelatedProducts(related.slice(0, 3));
      }
    } catch (err) {
      logger.error('Failed to fetch smart recommendations:', err);
    }
  };

  // [FIX] Move derived values above handlers so references like `displayImage`
  // are not accessed before initialization inside the closure below.
  const displayImage = product?.images && product.images.length > 0
    ? getImageUrl(product.images[0]) || FALLBACK_IMAGE
    : FALLBACK_IMAGE;

  const displayPrice = product?.variants && product.variants.length > 0
    ? formatProductPrice(product.variants[0].price)
    : formatProductPrice(product?.basePrice);

  const handleAddToCart = () => {
    if (!product) return;
    if (justAdded) return; // [FIX] Prevent double-click race.

    if (!product.variants?.length) {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.basePrice,
        image: displayImage,
        variantId: null
      }, 'Default');
      toast.success('Added to selection');
      setJustAdded(true);
      return;
    }

    if (!selectedVariant) {
      toast.error('Please select a size');
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      price: selectedVariant.price,
      image: displayImage,
      variantId: selectedVariant.id
    }, selectedVariant.name);

    toast.success('Added to selection');
    setJustAdded(true);
  };

  // [FIX] Clear the justAdded timer in cleanup so we never race setState on unmount.
  useEffect(() => {
    if (!justAdded) return undefined;
    const t = setTimeout(() => setJustAdded(false), 1800);
    return () => clearTimeout(t);
  }, [justAdded]);

  if (loading) {
    return (
      <Layout headerVariant="solid">
        <ProductDetailSkeleton />
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout headerVariant="solid">
        <div className="min-h-[60vh] flex flex-col items-center justify-center mt-[60px] gap-4">
          <p className="text-[13px] text-red-500">{error || 'Product not found'}</p>
          <Link to="/shop" className="text-[13px] underline hover:text-black">
            Back to Shop
          </Link>
        </div>
      </Layout>
    );
  }

  const allMedia = product
    ? (product.images && product.images.length > 0 ? product.images : [displayImage]).concat(
        product.videoUrl ? [{ isVideo: true, url: product.videoUrl }] : []
      )
    : [];

  return (
    <Layout headerVariant="solid">
      <div className="flex flex-col lg:flex-row mt-[60px]">
        <div className="w-full lg:w-1/2 flex flex-col lg:gap-4 lg:pr-4">
          {/* DESKTOP STACKED IMAGE GALLERY */}
          <div className="hidden lg:flex flex-col gap-4">
            {(product.images && product.images.length > 0 ? product.images : [displayImage]).map((img, index) => (
              <motion.div
                key={index}
                className="w-full"
                initial={reduceMotion ? false : { opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.05 * index }}
              >
                <img
                  src={getImageUrl(img) || FALLBACK_IMAGE}
                  alt={`${product.name} View ${index + 1}`}
                  className="w-full h-auto object-cover"
                  onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                />
              </motion.div>
            ))}

            {product.videoUrl && (
              <div className="w-full aspect-[9/16] lg:aspect-square bg-black overflow-hidden">
                <video
                  src={getImageUrl(product.videoUrl)}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* MOBILE VERTICAL SCROLL IMAGE GALLERY & THEME-MATCHED CONTROL ICONS */}
          <div className="lg:hidden w-full relative">
            <div
              ref={mobileGalleryRef}
              onScroll={handleMobileScroll}
              className="w-full h-[70vh] max-h-[560px] overflow-y-auto snap-y snap-mandatory scrollbar-hide relative bg-background-light border-b border-black/5"
            >
              {allMedia.map((media, index) => (
                <div
                  key={index}
                  className="w-full h-full flex-shrink-0 snap-center relative flex items-center justify-center bg-background-light overflow-hidden"
                >
                  {typeof media === 'object' && media.isVideo ? (
                    <div className="w-full h-full bg-black">
                      <video
                        src={getImageUrl(media.url)}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <img
                      src={getImageUrl(media) || FALLBACK_IMAGE}
                      alt={`${product.name} View ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* THEME-MATCHED CONTROL ICONS & COUNTER (MOBILE) */}
            {allMedia.length > 1 && (
              <>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2.5 z-20">
                  {/* Previous Image Chevron Icon */}
                  <button
                    type="button"
                    onClick={() => scrollToMobileImage(Math.max(0, mobileActiveImage - 1))}
                    disabled={mobileActiveImage === 0}
                    aria-label="Previous image"
                    className="w-8 h-8 rounded-full bg-black/75 backdrop-blur-md text-white flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed hover:bg-black transition-all shadow-md border border-white/20"
                  >
                    <ChevronUp size={16} />
                  </button>

                  {/* Vertical Indicator Dots */}
                  <div className="flex flex-col items-center gap-1.5 bg-black/60 backdrop-blur-md px-1.5 py-2.5 rounded-full border border-white/20 shadow-md">
                    {allMedia.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => scrollToMobileImage(idx)}
                        aria-label={`Go to image ${idx + 1}`}
                        className={`w-2 rounded-full transition-all duration-300 ${
                          mobileActiveImage === idx
                            ? 'h-4 bg-accent ring-1 ring-accent-strong'
                            : 'h-2 bg-white/50 hover:bg-white'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Next Image Chevron Icon */}
                  <button
                    type="button"
                    onClick={() => scrollToMobileImage(Math.min(allMedia.length - 1, mobileActiveImage + 1))}
                    disabled={mobileActiveImage === allMedia.length - 1}
                    aria-label="Next image"
                    className="w-8 h-8 rounded-full bg-black/75 backdrop-blur-md text-white flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed hover:bg-black transition-all shadow-md border border-white/20"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>

                {/* Floating Counter Badge */}
                <div className="absolute left-3 bottom-3 z-20">
                  <div className="bg-black/75 backdrop-blur-md text-white text-[10px] font-mono px-3 py-1.5 rounded-full border border-white/20 shadow-md flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span>{mobileActiveImage + 1} / {allMedia.length}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="w-full lg:w-1/2 relative">
          <div className="sticky top-[80px] px-4 py-8 lg:p-12 lg:max-w-xl mx-auto">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4">
              <Link to="/shop">Shop</Link> <span>/</span> <span>{product.category?.name || 'Products'}</span>
            </div>

            <div className="flex justify-between items-start gap-4 mb-8">
              <h1 className="text-sm md:text-3xl font-heading font-bold uppercase tracking-widest leading-tight flex-1">
                {product.name}
              </h1>
              <div className="text-sm md:text-xl font-bold whitespace-nowrap">
                {displayPrice}
              </div>
            </div>

            <motion.button
              onClick={handleAddToCart}
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
              className="btn-primary w-full py-4 mb-8 flex items-center justify-center gap-3"
            >
              <AnimatePresence mode="wait" initial={false}>
                {justAdded ? (
                  <motion.span
                    key="added"
                    className="flex items-center gap-2"
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <motion.path
                        d="M4 12l5 5L20 6"
                        initial={reduceMotion ? false : { pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </svg>
                    Added to Selection
                  </motion.span>
                ) : (
                  <motion.span
                    key="default"
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                  >
                    Add to Selection
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold uppercase tracking-wider">Size: {selectedVariant?.name || 'Select'}</span>
                <button
                  type="button"
                  onClick={() => setShowSizeGuide(true)}
                  className="text-xs underline text-gray-500 hover:text-black transition-colors"
                >
                  Size Guide
                </button>
              </div>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {product.variants && product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    disabled={variant.stockQuantity === 0}
                    className={cn(
                      "h-10 border text-[10px] font-bold transition-all relative",
                      selectedVariant?.id === variant.id
                        ? "border-black bg-black text-white"
                        : "border-gray-200 hover:border-black text-black",
                      variant.stockQuantity === 0 && "opacity-40 cursor-not-allowed border-gray-100"
                    )}
                  >
                    {variant.name}
                    {variant.stockQuantity === 0 && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-full h-[1px] bg-black rotate-45 opacity-20"></span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {product.variants?.length === 0 && (
                <p className="text-xs text-gray-500 italic">No sizes currently available.</p>
              )}
            </div>

            {/* CLOTH COLOR PALETTE (1-3 Colors) */}
            {Array.isArray(product.colorPalette || product.color_palette) && (product.colorPalette || product.color_palette).length > 0 && (
              <div className="mb-8 p-4 bg-background-light/50 border border-black/5 rounded-lg">
                <span className="text-xs font-bold uppercase tracking-[0.2em] block mb-2.5 text-black">
                  Cloth Color Palette
                </span>
                <div className="flex items-center gap-2.5">
                  {(product.colorPalette || product.color_palette).slice(0, 3).map((hex, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-black/10 shadow-xs">
                      <span
                        className="w-4 h-4 rounded-full border border-black/20 shadow-inner"
                        style={{ backgroundColor: hex }}
                      />
                      <span className="text-[10px] font-mono font-medium tracking-wider text-black/80 uppercase">
                        {hex}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OTHER COLORS SUGGESTION */}
            {otherColors.length > 0 && (
              <div className="mb-8">
                <span className="text-xs font-bold uppercase tracking-wider block mb-4">Other Colors</span>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {otherColors.map(colorProd => (
                    <Link key={colorProd.id} to={`/product/${colorProd.id}`} className="group flex-shrink-0">
                      <div className="w-16 h-20 bg-gray-100 overflow-hidden border border-gray-200 group-hover:border-black transition-colors">
                        <img 
                          src={getImageUrl(colorProd.images?.[0]) || FALLBACK_IMAGE} 
                          alt={colorProd.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-[9px] uppercase tracking-wide mt-1 block truncate w-16 text-gray-500 group-hover:text-black">
                        {colorProd.name.split('-').pop().trim() || 'View'}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ORGANIZED & ENHANCED PRODUCT DESCRIPTION */}
            {product.description && (
              <div className="mb-8 p-5 bg-background-light/60 border border-black/5 rounded-xl space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-black/5 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-black flex items-center gap-2 font-serif">
                    <Sparkles size={14} className="text-accent" />
                    Product Description & Silhouette Details
                  </h3>
                </div>

                {/* Paragraph Formatting */}
                <div className="text-xs leading-[1.85] text-gray-700 font-sans space-y-3">
                  {product.description.split('\n').filter(Boolean).map((paragraph, pIdx) => (
                    <p key={pIdx}>
                      {paragraph.trim()}
                    </p>
                  ))}
                </div>

                {/* Craftsmanship Highlights Grid */}
                <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-black/5">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-gray-700 font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                    <span>Artisanal Lagos Tailoring</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-medium text-gray-700 font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                    <span>Flowing Bubu Cut</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-medium text-gray-700 font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                    <span>Hand-Finished Detailing</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-medium text-gray-700 font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                    <span>Atelier Heritage Piece</span>
                  </div>
                </div>
              </div>
            )}

            {/* GARMENT CARE & FABRIC MAINTENANCE */}
            <GarmentCare className="mb-8" />

            <div className="text-[10px] text-gray-400 font-mono">
              Ref. {product.id?.slice(0, 8).toUpperCase() || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {turbanProducts.length > 0 && (
        <motion.section
          className="px-4 py-8 lg:py-16 border-t border-gray-100 bg-gray-50/50"
          initial={reduceMotion ? false : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="max-w-6xl mx-auto">
            <h2 className="text-xl lg:text-2xl font-heading font-black uppercase tracking-widest mb-2">Complete the Look</h2>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-8">Pair with our signature turbans</p>
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 md:grid md:grid-cols-3 scrollbar-hide">
              {turbanProducts.map((turban, i) => (
                <ProductCard key={turban.id} product={turban} delay={i * 0.08} inView={false} />
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {relatedProducts.length > 0 && (
        <motion.section
          className="px-4 py-8 lg:py-16 border-t border-gray-100"
          initial={reduceMotion ? false : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="max-w-6xl mx-auto">
            <h2 className="text-xl lg:text-2xl font-heading font-black uppercase tracking-widest mb-4 lg:mb-8">You May Also Like</h2>
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 md:grid md:grid-cols-3 scrollbar-hide">
              {relatedProducts.map((relProduct, i) => (
                <ProductCard key={relProduct.id} product={relProduct} delay={i * 0.08} inView={false} />
              ))}
            </div>
          </div>
        </motion.section>
      )}

      <SizeGuideModal open={showSizeGuide} onClose={() => setShowSizeGuide(false)} />
    </Layout>
  );
}
