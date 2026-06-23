import { motion, useReducedMotion } from 'framer-motion';

// [MOTION ADDED] Skewed skeleton loader used while products are loading.
// Replaces the previous "Loading…" text states. Skew signature is preserved.
export function ProductCardSkeleton() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      // [MOTION ADDED] deliberate stagger-in so the loading state itself feels intentional
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col"
      aria-hidden="true"
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        {/* [MOTION ADDED] Skewed image placeholder — signature premium detail */}
        <div
          className="shimmer-light absolute inset-0"
          style={{ transform: 'skewX(-4deg) scale(1.08)' }}
        />
        {/* [MOTION ADDED] Small badge placeholder top-left */}
        <div className="absolute top-3 left-3 w-8 h-8 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
      </div>

      <div className="flex justify-between items-start gap-2 pt-3 pb-1">
        <div className="flex-1 space-y-2">
          {/* [MOTION ADDED] Title line 1 (70% width) */}
          <div className="h-2.5 w-[70%] shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
          {/* [MOTION ADDED] Title line 2 (40% width) */}
          <div className="h-2.5 w-[40%] shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
        </div>
        {/* [MOTION ADDED] Price line (30% width) */}
        <div className="h-2.5 w-[30%] shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
      </div>
    </motion.div>
  );
}
