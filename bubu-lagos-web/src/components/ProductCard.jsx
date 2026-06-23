import { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { getImageUrl } from '../lib/utils';
import { FALLBACK_IMAGE } from '../lib/sampleProducts';
import { EASE_OUT } from '../lib/motion';

// Hoisted: avoid re-creating these on every render of the card list.
const CARD_VARIANTS = {
  rest: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
  hidden: { opacity: 0, y: 32 },
  hover: { transition: { staggerChildren: 0.04 } },
};
const QUICKVIEW_VARIANTS = {
  rest: { opacity: 0, y: 12 },
  hover: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } },
};

// Build a responsive srcset from a base URL by adding / adjusting ?w=.
function withSrcSet(src) {
  if (!src || !src.startsWith('http')) return null;
  // Strip the existing w= param if present
  const base = src.replace(/[?&]w=\d+/, '');
  return `${base}, ${base}${base.includes('?') ? '&' : '?'}w=400 400w, ${base}${base.includes('?') ? '&' : '?'}w=800 800w, ${base}${base.includes('?') ? '&' : '?'}w=1200 1200w`;
}

// Inner card — separated so we can wrap it in memo().
const ProductCardInner = function ProductCard({ product, inView = true }) {
  // [FIX] inView is part of the public prop API for staggered list entry;
  // some call sites pass delay alongside it.
  void inView;
  const reduceMotion = useReducedMotion();
  const cardRef = useRef(null);

  const displayImage = product.images && product.images.length > 0
    ? getImageUrl(product.images[0])
    : 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=533&fit=crop';

  // [NEW] Gift cards (and any product that opts in via product.linkOverride) should
  // route to their override URL instead of the standard /product/:id detail page.
  const href = product.linkOverride || `/product/${product.id}`;

  // [NEW] Allow a product to override its price label (e.g. gift card "From ₦100,000").
  const hasPriceLabel = typeof product.priceLabel === 'string' && product.priceLabel.length > 0;
  const displayPrice = hasPriceLabel
    ? product.priceLabel
    : product.variants && product.variants.length > 0
      ? `₦${product.variants[0].price.toLocaleString()}`
      : `₦${product.basePrice?.toLocaleString() || '0'}`;

  // [MOTION ADDED] Price count-up reveal — skipped for products that use a static price label.
  const priceText = displayPrice.replace(/[^\d]/g, '');
  const targetNumber = hasPriceLabel ? 0 : parseInt(priceText, 10) || 0;
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString());
  const [displayCount, setDisplayCount] = useState(hasPriceLabel ? priceText : '0');
  const inViewCard = useInView(cardRef, { once: true, margin: '-80px' });

  useEffect(() => {
    if (reduceMotion || hasPriceLabel) {
      setDisplayCount(hasPriceLabel ? priceText : targetNumber.toLocaleString());
      return;
    }
    let frameId;
    const duration = 700; // ms
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const v = targetNumber * eased;
      motionValue.set(v);
      if (t < 1) frameId = requestAnimationFrame(step);
    };
    if (inViewCard) {
      frameId = requestAnimationFrame(step);
    }
    const unsub = rounded.on('change', (v) => setDisplayCount(v));
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      unsub();
    };
  }, [inViewCard, targetNumber, hasPriceLabel]);

  // [MOTION ADDED] Custom cursor for product image
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const springConfig = { damping: 22, stiffness: 250, mass: 0.4 };
  const cursorXSmooth = useSpring(cursorX, springConfig);
  const cursorYSmooth = useSpring(cursorY, springConfig);
  const [cursorVisible, setCursorVisible] = useState(false);

  const handleImageMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    cursorX.set(e.clientX - rect.left);
    cursorY.set(e.clientY - rect.top);
  };

  return (
    <motion.div
      ref={cardRef}
      initial="hidden"
      animate={inView ? 'rest' : 'hidden'}
      variants={CARD_VARIANTS}
      whileHover={reduceMotion ? undefined : 'hover'}
      whileFocus={reduceMotion ? undefined : 'hover'}
      whileTap={reduceMotion ? undefined : 'hover'}
      data-motion="product-card"
      className="flex flex-col group"
    >
      <Link
        to={href}
        className="flex flex-col group"
        aria-label={product.isGiftCard
          ? `Send a Bubu Lagos gift card`
          : `View ${product.name}`}
      >
        <div
          className="relative aspect-[3/4] overflow-hidden bg-background-light"
          onMouseEnter={() => !reduceMotion && setCursorVisible(true)}
          onMouseLeave={() => setCursorVisible(false)}
          onMouseMove={handleImageMouseMove}
        >
          <motion.img
            src={displayImage}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
            // srcset: 400w / 800w / 1200w
            srcSet={withSrcSet(displayImage) || undefined}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            whileHover={reduceMotion ? undefined : { scale: 1.07 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
          />

          {product.category?.name && (
            <motion.span
              className="absolute top-3 left-3 text-[9px] uppercase tracking-[0.3em] text-white bg-black/60 px-2 py-1"
              initial={reduceMotion ? false : { opacity: 0, letterSpacing: '0.3em' }}
              animate={inView || inViewCard ? { opacity: 1, letterSpacing: '0.12em' } : undefined}
              whileInView={!inView && !inViewCard ? { opacity: 1, letterSpacing: '0.12em' } : undefined}
              transition={{ duration: 0.6, ease: EASE_OUT }}
            >
              {product.category.name}
            </motion.span>
          )}

          {product.isGiftCard && (
            <span
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] text-text bg-accent/90 text-white px-2 py-1 font-bold"
              aria-hidden="true"
            >
              Give the gift
            </span>
          )}

          <motion.span
            aria-hidden="true"
            className="absolute left-3 right-3 bottom-3 inline-flex items-center justify-center gap-2 py-2.5 bg-accent text-white text-[10px] font-bold uppercase tracking-[0.18em] shadow-[0_8px_24px_rgba(15,61,46,0.35)] ring-1 ring-accent-strong/40"
            variants={QUICKVIEW_VARIANTS}
            style={{ pointerEvents: 'none' }}
          >
            <span>{product.isGiftCard ? 'Send a Gift Card' : 'View Product'}</span>
            <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
          </motion.span>

          {!reduceMotion && (
            <motion.div
              className="hidden md:block absolute w-10 h-10 rounded-full border border-white/80 mix-blend-difference cursor-image-track"
              style={{
                x: cursorXSmooth,
                y: cursorYSmooth,
                translateX: '-50%',
                translateY: '-50%',
                opacity: cursorVisible ? 1 : 0,
                scale: cursorVisible ? 1 : 0.4,
              }}
              transition={{ opacity: { duration: 0.2 }, scale: { duration: 0.2 } }}
            />
          )}
        </div>

        <div className="flex justify-between items-start gap-2 pt-3 pb-1">
          <span className="text-[11px] leading-tight text-text uppercase tracking-wide group-hover:underline decoration-1 underline-offset-2">
            {product.name}
          </span>
          <span className="text-[11px] leading-tight font-medium text-text whitespace-nowrap">
            {hasPriceLabel ? displayPrice : `₦${displayCount}`}
          </span>
        </div>
      </Link>
    </motion.div>
  );
};

// Memoize so a Shop/Search re-render doesn't re-render every card.
// Equality on product id + key visual fields.
export const ProductCard = memo(ProductCardInner, (prev, next) =>
  prev.product?.id === next.product?.id &&
  prev.delay === next.delay &&
  prev.inView === next.inView &&
  prev.product?.name === next.product?.name
);
