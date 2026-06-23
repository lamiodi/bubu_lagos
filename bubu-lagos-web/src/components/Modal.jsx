import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';
import { EASE_OUT } from '../lib/motion';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
};

/**
 * Shared modal that all admin list pages can use.
 * - Focus trap (Tab cycles inside the modal)
 * - ESC closes
 * - Body scroll lock while open
 * - aria-modal + aria-labelledby for screen readers
 * - Restores focus to the opener on close
 */
export function Modal({
  open,
  onClose,
  title,
  size = 'lg',
  closeOnBackdrop = true,
  showClose = true,
  children,
  footer,
}) {
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    // Remember what was focused before the modal opened so we can restore it.
    previouslyFocused.current = document.activeElement;
    openerRef.current = document.activeElement;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Defer focus by one tick so the dialog is in the DOM.
    const t = setTimeout(() => {
      const focusable = dialogRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }, 0);

    return () => {
      clearTimeout(t);
      document.body.style.overflow = originalOverflow;
      // Restore focus to the element that opened the modal.
      if (previouslyFocused.current && typeof previouslyFocused.current.focus === 'function') {
        previouslyFocused.current.focus();
      }
    };
  }, [open]);

  // ESC to close + focus trap on Tab.
  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll(
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
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
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
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            className={cn(
              'relative bg-white rounded-xl shadow-2xl w-full max-h-[90vh] overflow-y-auto',
              SIZES[size] || SIZES.lg
            )}
            initial={reduceMotion ? { y: 0, opacity: 1, scale: 1 } : { y: 16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduceMotion ? { y: 0, opacity: 1, scale: 1 } : { y: 8, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
          >
            {(title || showClose) && (
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                {title ? (
                  <h2 id="modal-title" className="text-xl font-bold text-gray-900">
                    {title}
                  </h2>
                ) : <span />}
                {showClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            )}
            <div className="p-6">{children}</div>
            {footer && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-2">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Modal;
