import { cn } from '../lib/utils';
import { motion, useReducedMotion } from 'framer-motion';
import { ProductCardSkeleton } from './ProductCardSkeleton';

/**
 * Base luxury skeleton loader component.
 * Theme-aligned with Bubu Lagos skewed design language and shimmer effect.
 */
export function Skeleton({ className, skew = true, dark = false }) {
  const shimmerClass = dark ? 'shimmer-dark' : 'shimmer-light';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xs',
        shimmerClass,
        className
      )}
      style={
        skew
          ? { transform: typeof skew === 'string' ? skew : 'skewX(-4deg)' }
          : undefined
      }
      aria-hidden="true"
    />
  );
}

export function TableRowSkeleton({ columns = 5 }) {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className="h-4 w-full" skew={false} />
        </td>
      ))}
    </tr>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm" aria-hidden="true">
      <div className="flex justify-between items-start mb-4">
        <Skeleton className="h-10 w-10 rounded-lg" skew={false} />
        <Skeleton className="h-5 w-16 rounded-full" skew={false} />
      </div>
      <Skeleton className="h-3 w-24 mb-2" skew={false} />
      <Skeleton className="h-7 w-32" skew={false} />
    </div>
  );
}

export function ProductDetailSkeleton() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="flex flex-col lg:flex-row mt-[60px]"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      aria-hidden="true"
    >
      {/* Left Gallery Placeholder */}
      <div className="w-full lg:w-1/2 flex flex-col lg:gap-4 lg:pr-4">
        {/* DESKTOP STACKED IMAGE GALLERY SKELETON */}
        <div className="hidden lg:flex flex-col gap-4">
          <div className="aspect-[3/4] w-full shimmer-light" style={{ transform: 'skewX(-4deg) scale(1.02)' }} />
          <div className="aspect-[3/4] w-full shimmer-light" style={{ transform: 'skewX(-4deg) scale(1.02)' }} />
        </div>
        
        {/* MOBILE VERTICAL SCROLL IMAGE GALLERY SKELETON */}
        <div className="lg:hidden w-full h-[70vh] max-h-[560px] shimmer-light" />
      </div>

      {/* Right Details Placeholder */}
      <div className="w-full lg:w-1/2 relative">
        <div className="sticky top-[80px] px-4 py-8 lg:p-12 lg:max-w-xl mx-auto">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 mb-4">
            <div className="h-2.5 w-8 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
            <div className="h-2.5 w-2 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
            <div className="h-2.5 w-16 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
          </div>

          {/* Title and Price */}
          <div className="flex justify-between items-start gap-4 mb-8">
            <div className="space-y-3 flex-1">
              <div className="h-6 md:h-8 w-[80%] shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
              <div className="h-6 md:h-8 w-[50%] shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
            </div>
            <div className="h-6 md:h-8 w-24 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
          </div>

          {/* Add to selection button */}
          <div className="h-14 w-full shimmer-light mb-8" style={{ transform: 'skewX(-4deg)' }} />

          {/* Size picker */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div className="h-3 w-16 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
              <div className="h-3 w-14 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
            </div>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-10 w-full rounded-xs shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
              ))}
            </div>
          </div>

          {/* Description Block */}
          <div className="mb-8 p-5 bg-background-light/60 border border-black/5 rounded-xl space-y-4 shadow-xs">
            <div className="h-3.5 w-2/3 shimmer-light border-b border-black/5 pb-3" style={{ transform: 'skewX(-4deg)' }} />
            
            <div className="space-y-3 pt-2">
              <div className="h-2.5 w-full shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
              <div className="h-2.5 w-[90%] shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
              <div className="h-2.5 w-[75%] shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
              <div className="h-2.5 w-[85%] shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-black/5">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full shimmer-light" />
                  <div className="h-2.5 w-24 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}

export function CartSkeleton() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="container mx-auto px-4 py-12 md:py-20 max-w-6xl"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      aria-hidden="true"
    >
      <div className="h-9 w-64 mx-auto mb-12 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1 space-y-8">
          <div className="h-5 w-full shimmer-light pb-4" style={{ transform: 'skewX(-4deg)' }} />

          {[1, 2].map((i) => (
            <div key={i} className="flex gap-4 md:gap-8 border-b border-gray-100 pb-8">
              <div className="w-24 h-32 shimmer-light flex-shrink-0" style={{ transform: 'skewX(-4deg)' }} />
              <div className="flex-1 space-y-4 pt-2">
                <div className="h-5 w-[60%] shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
                <div className="h-4 w-20 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
                <div className="h-4 w-16 shimmer-light pt-2" style={{ transform: 'skewX(-4deg)' }} />
              </div>
              <div className="h-6 w-20 shimmer-light pt-2" style={{ transform: 'skewX(-4deg)' }} />
            </div>
          ))}
        </div>

        <div className="lg:w-[400px] bg-gray-50 p-8 h-fit space-y-6">
          <div className="h-6 w-40 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
          <div className="space-y-4 py-4 border-y border-gray-200">
            <div className="flex justify-between">
              <div className="h-4 w-20 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
              <div className="h-4 w-24 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
            </div>
            <div className="flex justify-between">
              <div className="h-4 w-20 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
              <div className="h-4 w-32 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
            </div>
          </div>
          <div className="h-14 w-full shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
        </div>
      </div>
    </motion.div>
  );
}

export function CheckoutSkeleton() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="container mx-auto px-4 py-12 md:py-20 max-w-6xl"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      aria-hidden="true"
    >
      <div className="h-8 w-44 mb-12 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1 space-y-8">
          <div className="space-y-4">
            <div className="h-5 w-40 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
            <div className="h-12 w-full shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="h-5 w-48 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-12 w-full shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
              <div className="h-12 w-full shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
            </div>
            <div className="h-12 w-full shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
            <div className="grid grid-cols-3 gap-4">
              <div className="h-12 w-full shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
              <div className="h-12 w-full shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
              <div className="h-12 w-full shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
            </div>
            <div className="h-12 w-full shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
          </div>
        </div>

        <div className="lg:w-[420px] bg-gray-50 p-8 h-fit space-y-6">
          <div className="h-6 w-36 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />

          <div className="space-y-4 border-y border-gray-200 py-4">
            <div className="flex gap-4">
              <div className="w-16 h-20 shimmer-light flex-shrink-0" style={{ transform: 'skewX(-4deg)' }} />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 w-[70%] shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
                <div className="h-3 w-16 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="h-4 w-20 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
              <div className="h-4 w-24 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
            </div>
            <div className="flex justify-between">
              <div className="h-4 w-20 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
              <div className="h-4 w-20 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
            </div>
          </div>

          <div className="h-14 w-full shimmer-light mt-6" style={{ transform: 'skewX(-4deg)' }} />
        </div>
      </div>
    </motion.div>
  );
}

export function OrderDetailSkeleton() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 sm:p-8 space-y-8"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      aria-hidden="true"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div className="space-y-2">
          <div className="h-3 w-24 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
          <div className="h-6 w-48 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
        </div>
        <div className="h-8 w-28 shimmer-light rounded-full" style={{ transform: 'skewX(-4deg)' }} />
      </div>

      <div className="py-2">
        <div className="h-3 w-32 mb-6 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 bg-gray-50 rounded-xl space-y-2">
              <div className="w-8 h-8 shimmer-light rounded-full mb-3" style={{ transform: 'skewX(-4deg)' }} />
              <div className="h-3.5 w-24 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
              <div className="h-2.5 w-16 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
        <div className="p-6 bg-gray-50 rounded-xl space-y-3">
          <div className="h-4 w-36 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
          <div className="h-3 w-48 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
          <div className="h-3 w-40 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
        </div>
        <div className="p-6 bg-gray-50 rounded-xl space-y-3">
          <div className="h-4 w-36 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
          <div className="h-3 w-32 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
          <div className="h-5 w-28 shimmer-light pt-1" style={{ transform: 'skewX(-4deg)' }} />
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-gray-100">
        <div className="h-4 w-28 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
        <div className="flex gap-4 p-4 border border-gray-100 rounded-xl">
          <div className="w-16 h-20 shimmer-light flex-shrink-0" style={{ transform: 'skewX(-4deg)' }} />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 w-[60%] shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
            <div className="h-3 w-20 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
          </div>
          <div className="h-5 w-20 shimmer-light" style={{ transform: 'skewX(-4deg)' }} />
        </div>
      </div>
    </motion.div>
  );
}

export function SearchSkeleton({ count = 4 }) {
  return (
    <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableEmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="p-12 text-center">
      {Icon && (
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
          <Icon size={20} strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-sm font-bold text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">{description}</p>}
      {action}
    </div>
  );
}

export default Skeleton;
