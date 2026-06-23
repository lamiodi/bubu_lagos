import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { EASE_OUT } from '../lib/motion';

/**
 * Premium confirmation dialog with framer-motion.
 * Use this instead of window.confirm() / alert().
 */
export function ConfirmDialog({
  open,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger', // 'danger' | 'primary'
  onConfirm,
  onCancel,
}) {
  const reduceMotion = useReducedMotion();
  const confirmRef = useRef(null);

  // Focus the primary action on open + ESC to close.
  useEffect(() => {
    if (!open) return undefined;
    confirmRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
      if (e.key === 'Enter') onConfirm?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onConfirm, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onCancel}
            aria-hidden="true"
          />
          <motion.div
            className="relative bg-white rounded-md shadow-2xl max-w-md w-full p-6"
            initial={reduceMotion ? { y: 0, opacity: 1 } : { y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { y: 0, opacity: 1 } : { y: 8, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
          >
            <h2 id="confirm-title" className="text-base font-bold uppercase tracking-widest mb-2">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                {description}
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest border border-gray-200 hover:border-black transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={onConfirm}
                className={`px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none ${
                  variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-gray-900'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ConfirmDialog;
