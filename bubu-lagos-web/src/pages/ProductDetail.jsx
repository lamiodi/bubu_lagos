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
import { ChevronUp, ChevronDown, Sparkles, ShoppingBag, Check } from 'lucide-react';

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
  const [mobileActiveImage, setMobileActiveImage] = useState(0);
  const [showStickyBar, setShowStickyBar] = useState(false);

  const mobileGalleryRef = useRef(null);
  const addToCartBtnRef = useRef(null);

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

  // Sticky Mobile Bar Scroll Observer
  useEffect(() => {
    const handleWindowScroll = () => {
      if (!addToCartBtnRef.current) return;
      const rect = addToCartBtnRef.current.getBoundingClientRect();
      // Show sticky bar on mobile when main button is scrolled above viewport
      if (rect.bottom < 0 && window.innerWidth < 1024) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, []);

  useEffect(() => {
    setActiveImage(0);
    setMobileActiveImage(0);
    setSelectedVariant(null);
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
      } else {
        setSelectedVariant(null);
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
      // 2. Fetch all products to reliably find color variations and complete-the-look items
      const catRes = await api.get(`/products?limit=50`); 
      let allProducts = catRes.products || [];
      allProducts = allProducts.filter(p => p.id !== productData.id);

      // 1. Smart matching Turbans & Gelès for "Complete the Look"
      const turbans = allProducts.filter(p => p.category?.name === 'Turbans & Gelès' || p.category?.name?.toLowerCase().includes('turban'));
      setTurbanProducts(turbans.slice(0, 3));
      
      // Extract base name by stripping roman numerals at the end (I, II, III, etc.)
      const extractBaseName = (name) => {
        if (!name) return '';
        const match = name.match(/^(.*?)(?:\s+(?:I|II|III|IV|V|VI|VII|VIII|IX|X))?$/i);
        return match ? match[1].trim() : name.trim();
      };

      const currentBaseName = extractBaseName(productData.name);

      // Find other products that share the exact same base name
      const colors = allProducts.filter(p => {
        return extractBaseName(p.name).toLowerCase() === currentBaseName.toLowerCase();
      });

      setOtherColors(colors.slice(0, 4));
      
      // Find related products (same category, excluding the variants)
      let related = allProducts.filter(p => 
        p.category?.name === productData.category?.name && 
        !colors.find(c => c.id === p.id) &&
        !p.category?.name?.toLowerCase().includes('turban')
      );
      
      // Fallback: If inventory is small and we don't have enough same-category items, 
      // fill with products from other categories (excluding turbans which have their own section)
      if (related.length < 3) {
        const otherCategories = allProducts.filter(p => 
          p.category?.name !== productData.category?.name && 
          !p.category?.name?.toLowerCase().includes('turban') &&
          !colors.find(c => c.id === p.id) &&
          !related.find(r => r.id === p.id)
        );
        related = [...related, ...otherCategories];
      }

      setRelatedProducts(related.slice(0, 3));
    } catch (err) {
      logger.error('Failed to fetch smart recommendations:', err);
    }
  };

  const displayImage = product?.images && product.images.length > 0
    ? getImageUrl(product.images[0]) || FALLBACK_IMAGE
    : FALLBACK_IMAGE;

  const displayPrice = product?.variants && product.variants.length > 0
    ? formatProductPrice(product.variants[0].price)
    : formatProductPrice(product?.basePrice);

  const handleAddToCart = () => {
    if (!product) return;
    if (justAdded) return;

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
    <Layout
      headerVariant="solid"
      title={`${product.name} | Bubu Lagos Atelier`}
      description={product.description || `Discover ${product.name} from the Bubu Lagos luxury couture collection.`}
      image={displayImage}
    >
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
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                />
              </motion.div>
            ))}

            {product.videoUrl && (
              <div className="w-full aspect-[9/16] lg:aspect-square bg-black overflow-hidden rounded-lg">
                <video
                  controls
                  playsInline
                  preload="auto"
                  className="w-full h-full object-cover"
                >
                  <source src={getImageUrl(product.videoUrl)} type="video/mp4" />
                  <source src={product.videoUrl} type="video/quicktime" />
                  Your browser does not support HTML5 video playback.
                </video>
              </div>
            )}
          </div>

          {/* MOBILE VERTICAL SCROLL IMAGE GALLERY */}
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
                        controls
                        playsInline
                        preload="auto"
                        className="w-full h-full object-cover"
                      >
                        <source src={getImageUrl(media.url)} type="video/mp4" />
                        <source src={media.url} type="video/quicktime" />
                        Your browser does not support HTML5 video playback.
                      </video>
                    </div>
                  ) : (
                    <img
                      src={getImageUrl(media) || FALLBACK_IMAGE}
                      alt={`${product.name} View ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading={index === 0 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : "auto"}
                      onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* CONTROL ICONS & COUNTER (MOBILE) */}
            {allMedia.length > 1 && (
              <>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2.5 z-20">
                  <button
                    type="button"
                    onClick={() => scrollToMobileImage(Math.max(0, mobileActiveImage - 1))}
                    disabled={mobileActiveImage === 0}
                    aria-label="Previous image"
                    className="w-8 h-8 rounded-full bg-black/75 backdrop-blur-md text-white flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed hover:bg-black transition-all shadow-md border border-white/20"
                  >
                    <ChevronUp size={16} />
                  </button>

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
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-light mb-4">
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

            <div ref={addToCartBtnRef}>
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
                      <Check size={18} />
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
            </div>

            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span>Size:</span>
                  <span className="text-black font-extrabold">{selectedVariant?.name || 'Select'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowSizeGuide(true)}
                  className="text-xs font-bold underline text-text-light hover:text-black transition-colors flex items-center gap-1"
                >
                  <Sparkles size={12} className="text-accent" />
                  Size Guide
                </button>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {product.variants && product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    disabled={variant.stockQuantity === 0}
                    className={cn(
                      "min-h-10 px-4 py-2 border text-xs font-bold transition-all relative rounded-md flex items-center justify-center text-center",
                      selectedVariant?.id === variant.id
                        ? "border-black bg-black text-white shadow-xs"
                        : "border-border hover:border-black text-black bg-white",
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
                <p className="text-xs text-text-light italic">No sizes currently available.</p>
              )}

              {/* Bubu Universal Fit Callout */}
              {Boolean(selectedVariant?.name?.toLowerCase().includes('one size') || selectedVariant?.name?.toLowerCase().includes('fits 8')) && (
                <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl flex items-start gap-2.5">
                  <Sparkles size={15} className="text-accent mt-0.5 flex-shrink-0" />
                  <div className="text-[11px] text-amber-950 leading-relaxed">
                    <strong className="font-bold text-black">Bubu Universal Fit (UK 8 – 20 / US 4 – 16):</strong> Masterfully tailored with a voluminous, fluid drape that falls effortlessly across your curves with zero restrictive seams.
                  </div>
                </div>
              )}
            </div>

            {/* CLOTH COLOR PALETTE */}
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
                      <span className="text-[9px] uppercase tracking-wide mt-1 block truncate w-16 text-text-light group-hover:text-black">
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
                    Product Description &amp; Silhouette Details
                  </h3>
                </div>

                <div className="text-xs leading-[1.85] text-text font-sans space-y-3">
                  {product.description.split('\n').filter(Boolean).map((paragraph, pIdx) => (
                    <p key={pIdx}>
                      {paragraph.trim()}
                    </p>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-black/5">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-text-light font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                    <span>Artisanal Lagos Tailoring</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-medium text-text-light font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                    <span>Flowing Bubu Cut</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-medium text-text-light font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                    <span>Hand-Finished Detailing</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-medium text-text-light font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                    <span>Atelier Heritage Piece</span>
                  </div>
                </div>
              </div>
            )}

            {/* GARMENT CARE & FABRIC MAINTENANCE */}
            <GarmentCare className="mb-8" />

            <div className="text-[10px] text-text-light font-mono">
              Ref. {product.id?.slice(0, 8).toUpperCase() || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {turbanProducts.length > 0 && (
        <motion.section
          className="px-4 py-8 lg:py-16 border-t border-border bg-background-light/50"
          initial={reduceMotion ? false : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="max-w-6xl mx-auto">
            <h2 className="text-xl lg:text-2xl font-heading font-black uppercase tracking-widest mb-2">Complete the Look</h2>
            <p className="text-xs text-text-light uppercase tracking-widest mb-8">Pair with our signature turbans</p>
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 md:grid md:grid-cols-3 scrollbar-hide">
              {turbanProducts.map((turban, i) => (
                <div key={turban.id} className="w-[240px] sm:w-[280px] md:w-auto flex-shrink-0 snap-start">
                  <ProductCard product={turban} delay={i * 0.08} allowVideoPreview={false} />
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {relatedProducts.length > 0 && (
        <motion.section
          className="px-4 py-8 lg:py-16 border-t border-border"
          initial={reduceMotion ? false : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="max-w-6xl mx-auto pb-16 lg:pb-0">
            <h2 className="text-xl lg:text-2xl font-heading font-black uppercase tracking-widest mb-4 lg:mb-8">You May Also Like</h2>
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 md:grid md:grid-cols-3 scrollbar-hide">
              {relatedProducts.map((relProduct, i) => (
                <div key={relProduct.id} className="w-[240px] sm:w-[280px] md:w-auto flex-shrink-0 snap-start">
                  <ProductCard product={relProduct} delay={i * 0.08} allowVideoPreview={false} />
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* STICKY MOBILE ADD-TO-SELECTION BAR (Phase 2) */}
      <AnimatePresence>
        {showStickyBar && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-md text-white p-3 px-4 border-t border-white/10 flex items-center justify-between gap-3 shadow-2xl"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <img src={displayImage} alt={product.name} className="w-10 h-12 object-cover rounded-xs border border-white/20 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white truncate">{product.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-accent-light font-bold">{displayPrice}</span>
                  {selectedVariant && (
                    <span className="text-[9px] text-white/70 uppercase tracking-widest border border-white/20 px-1.5 py-0.5 rounded">
                      {selectedVariant.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={justAdded}
              className="btn-accent py-2.5 px-4 text-[10px] whitespace-nowrap shadow-md flex-shrink-0"
            >
              {justAdded ? 'Added ✓' : '+ Add to Selection'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <SizeGuideModal
        open={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
        selectedSize={selectedVariant?.name}
      />
    </Layout>
  );
}
