import { Layout } from '../components/Layout';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { cn, getImageUrl, formatProductPrice } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import { logger } from '../lib/logger';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ProductCard } from '../components/ProductCard';
import { FALLBACK_IMAGE } from '../lib/sampleProducts';

export function ProductDetail() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const toast = useToast();
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  // [MOTION ADDED] Local "added" success state for the Add to Cart button
  const [justAdded, setJustAdded] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get(`/products/${id}`);
      setProduct(data);

      if (data.category?.id) {
        fetchRelatedProducts(data.category.id, data.id);
      }
    } catch (err) {
      logger.error('Failed to fetch product:', err);
      setError('Product not found or unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedProducts = async (categoryId, currentProductId) => {
    try {
      const data = await api.get(`/products/recommendations?productId=${currentProductId}&categoryId=${categoryId}&limit=3`);
      const list = data.products || [];
      if (list.length > 0) setRelatedProducts(list);
    } catch (err) {
      logger.error('Failed to fetch recommendations:', err);
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
        <div className="min-h-[60vh] flex items-center justify-center mt-[60px]">
          {/* [MOTION ADDED] Loading now uses a 2-up skewed skeleton grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-6xl px-4">
            <div className="aspect-[3/4] shimmer-light" style={{ transform: 'skewX(-4deg) scale(1.06)' }} />
            <div className="space-y-4">
              <div className="h-4 w-1/3 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
              <div className="h-8 w-2/3 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
              <div className="h-12 w-1/2 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
              <div className="h-14 w-full shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
            </div>
          </div>
        </div>
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

  return (
    <Layout headerVariant="solid">
      <div className="flex flex-col lg:flex-row mt-[60px]">
        <div className="w-full lg:w-1/2 flex flex-col lg:gap-4 lg:pr-4">
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
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="lg:hidden w-full overflow-x-auto snap-x snap-mandatory flex scrollbar-hide">
            {(product.images && product.images.length > 0 ? product.images : [displayImage]).map((img, index) => (
              <motion.div
                key={index}
                className="w-full flex-shrink-0 snap-center"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
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
              <div className="w-full flex-shrink-0 snap-center aspect-[9/16] bg-black">
                <video
                  src={getImageUrl(product.videoUrl)}
                  controls
                  className="w-full h-full object-cover"
                />
              </div>
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

            {/* [MOTION ADDED] Add to Cart button — whileTap + animated checkmark on success */}
            <motion.button
              onClick={handleAddToCart}
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
              className="w-full py-4 bg-black text-white text-sm font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors mb-8 flex items-center justify-center gap-3"
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
                <button className="text-xs underline text-gray-500 hover:text-black">Size Guide</button>
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

            {product.description && (
              <div className="space-y-4 text-sm leading-relaxed text-gray-600 mb-8">
                <p>{product.description}</p>
              </div>
            )}

            <div className="text-[10px] text-gray-400 font-mono">
              Ref. {product.id?.slice(0, 8).toUpperCase() || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <motion.section
          className="px-4 py-8 lg:py-16 border-t border-gray-100"
          initial={reduceMotion ? false : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="text-xl lg:text-2xl font-heading font-black uppercase tracking-widest mb-4 lg:mb-8">Complete the Look</h2>
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 md:grid md:grid-cols-3 scrollbar-hide">
            {relatedProducts.map((relProduct, i) => (
              <ProductCard key={relProduct.id} product={relProduct} delay={i * 0.08} inView={false} />
            ))}
          </div>
        </motion.section>
      )}
    </Layout>
  );
}
