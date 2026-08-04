import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

export function CustomCursor() {
  const reduceMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [cursorText, setCursorText] = useState('');

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Smooth spring physics for outer ring trailing behind mouse
  const springConfig = { damping: 26, stiffness: 280, mass: 0.3 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  useEffect(() => {
    if (reduceMotion) return;

    // Check if device supports fine pointer (desktop / trackpad)
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    if (!isFinePointer) return;

    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);

      const target = e.target;
      if (target && target instanceof Element) {
        const interactiveEl = target.closest('a, button, input, textarea, select, [role="button"], .cursor-pointer, [data-cursor]');
        if (interactiveEl) {
          setIsHovered(true);
          const text = interactiveEl.getAttribute('data-cursor');
          setCursorText(text || '');
        } else {
          setIsHovered(false);
          setCursorText('');
        }
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [reduceMotion, isVisible, mouseX, mouseY]);

  if (reduceMotion || !isVisible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {/* Instant Emerald & Gold Core Dot */}
      <motion.div
        className="fixed top-0 left-0 w-2.5 h-2.5 rounded-full bg-[#0F3D2E] shadow-[0_0_10px_#D4AF37] mix-blend-difference"
        style={{
          x: mouseX,
          y: mouseY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      />

      {/* Trailing Luxury Metallic Gold & Emerald Ring */}
      <motion.div
        className={`fixed top-0 left-0 flex items-center justify-center rounded-full transition-all duration-300 ${
          isHovered
            ? 'w-14 h-14 border border-[#D4AF37] bg-[#0F3D2E]/25 backdrop-blur-[1px] shadow-[0_0_20px_rgba(212,175,55,0.4)]'
            : 'w-8 h-8 border border-[#0F3D2E]/60 bg-transparent'
        }`}
        style={{
          x: smoothX,
          y: smoothY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      >
        {cursorText && (
          <span className="text-[8px] font-bold tracking-[0.22em] text-[#D4AF37] uppercase select-none drop-shadow-sm">
            {cursorText}
          </span>
        )}
      </motion.div>
    </div>
  );
}
