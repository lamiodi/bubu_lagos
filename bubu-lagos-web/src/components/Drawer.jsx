import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';
import { EASE_OUT } from '../lib/motion';

/**
 * Right-side slide-out panel.
 * - lg+: pins to the right edge with a fixed max-width
 * - <lg:  full-screen overlay
 * - Focus trap, ESC to close, body scroll lock, restore focus on close
 */
export function Drawer({
  open,
  onClose,
  title,
  // Header content (e.g. back button + title + close button). Renders above the body.
  header,
  // Hide the default close button (you can put one in `header`).
  showClose = true,
  closeOnBackdrop = true,
  // Tailwind max-width class for the lg+ panel. Default: max-w-[460px]
  panelClassName = 'max-w-[460px]',
  children,
}) {
  const reduceMotion = useReducedMotion();
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  // Body scroll lock + focus restore
  useEffect(() => {
    if (!open) return undefined;
    previouslyFocused.current = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
      if (previouslyFocused.current && typeof previouslyFocused.current.focus === 'function') {
        previouslyFocused.current.focus();
      }
    };
  }, [open]);

  // ESC + focus trap
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70]"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="presentation"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeOnBackdrop ? onClose : undefined}
            aria-hidden="true"
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Panel'}
            className={cn(
              'absolute top-0 right-0 h-full w-full md:w-[88%] md:max-w-[460px] bg-white shadow-2xl flex flex-col',
              'md:border-l md:border-border',
              panelClassName
            )}
            initial={reduceMotion ? { x: 0 } : { x: '100%' }}
            animate={{ x: 0 }}
            exit={reduceMotion ? { x: 0 } : { x: '100%' }}
            transition={{ duration: 0.34, ease: EASE_OUT }}
          >
            {header ?? (
              <div className="flex items-center justify-between px-5 md:px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
                {title ? (
                  <span className="font-heading text-sm font-bold tracking-[0.18em] uppercase">
                    {title}
                  </span>
                ) : <span />}
                {showClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close panel"
                    className="p-1 -mr-1 text-text hover:text-text-light transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none rounded"
                  >
                    <X size={22} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            )}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Drawer;
