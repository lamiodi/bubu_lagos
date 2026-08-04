import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, X, Compass, Feather } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FALLBACK_IMAGE, getCloudinaryVideoPoster, getCloudinaryOptimizedVideo } from '../lib/utils';

gsap.registerPlugin(ScrollTrigger);

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export const ATELIER_SLIDES = [
  {
    id: 'emerald-collection',
    title: 'The Emerald Collection',
    tag: 'SILK SILHOUETTES · LAGOS',
    description: 'Hand-cut silk shaped into fluid silhouettes, finished by artisans in Lagos with meticulous attention to every detail.',
    extendedStory: 'Crafted from pure mulberry silk, the Emerald Collection honors the richness of African flora and regal heritage. Each piece is individually draped on custom dress forms in our Admiralty Way atelier before hand-finishing by master tailors.',
    details: [
      { label: 'Origin', value: 'Lagos Atelier' },
      { label: 'Material', value: '100% Raw Mulberry Silk' },
      { label: 'Crafting Time', value: '38 Hand Hours' },
    ],
    src: 'https://res.cloudinary.com/dwmz4youk/image/upload/v1785883048/bubu_cta/WhatsApp_Image_2026-08-04_at_11.21.09_PM.jpg',
    type: 'image',
    alt: 'Emerald silk garment flowing with regal elegance in Lagos atelier'
  },
  {
    id: 'crafted-by-hand',
    title: 'Crafted by Hand',
    tag: 'HERITAGE CRAFT · TAILORING',
    description: 'Every stitch reflects patience, precision, and generations of African craftsmanship brought into a modern atelier.',
    extendedStory: 'In our Lagos studio, centuries of traditional West African garment construction merge with contemporary couture techniques. Master artisans dedicate countless hours to seamless hems and hand-pressed seams.',
    details: [
      { label: 'Technique', value: 'Hand-Stitching & Draping' },
      { label: 'Artisan', value: 'Lagos Master Guild' },
      { label: 'Finish', value: 'French Seams' },
    ],
    src: 'https://res.cloudinary.com/dwmz4youk/video/upload/v1785883060/bubu_cta/WhatsApp_Video_2026-08-04_at_11.21.15_PM.mp4',
    type: 'video',
    alt: 'Artisan hand stitching gold thread into luxury silk fabric'
  },
  {
    id: 'movement-in-silk',
    title: 'Movement in Silk',
    tag: 'DRAPE & FLUIDITY · MOVEMENT',
    description: 'Designed to flow effortlessly with every step, creating elegance that feels as natural as it looks.',
    extendedStory: 'Bubu Lagos garments are engineered around the beauty of human motion. Cut on the bias and weighted with subtle internal stays, the fabric dances gracefully with Lagos coastal breezes.',
    details: [
      { label: 'Silhouette', value: 'Flowing Oversized Cut' },
      { label: 'Weight', value: 'Lightweight 19mm Silk' },
      { label: 'Fluidity Grade', value: 'Ultra-Fluid' },
    ],
    src: 'https://res.cloudinary.com/dwmz4youk/video/upload/v1785883058/bubu_cta/WhatsApp_Video_2026-08-04_at_11.21.15_PM_1.mp4',
    type: 'video',
    alt: 'Flowing golden silk dress capturing fluid motion'
  },
  {
    id: 'art-of-gele',
    title: 'The Art of the Gelè',
    tag: 'SCULPTURAL HEADWEAR · GELE',
    description: 'Sculptural headpieces carefully styled to celebrate heritage with a contemporary perspective.',
    extendedStory: 'The Gelè is an architectural crowning statement of African womanhood. Our atelier interprets this traditional headwrap with modern pleated textures, structured silk organza, and crown jewel tones.',
    details: [
      { label: 'Style', value: 'Architectural Pleated Crown' },
      { label: 'Fabric', value: 'Aso-Oke & Silk Organza' },
      { label: 'Styling Time', value: 'Custom Fitted' },
    ],
    src: 'https://res.cloudinary.com/dwmz4youk/image/upload/v1785883055/bubu_cta/WhatsApp_Image_2026-08-04_at_11.21.13_PM.jpg',
    type: 'image',
    alt: 'Regal fashion portrait highlighting headpiece styling'
  },
  {
    id: 'inside-atelier',
    title: 'Inside the Atelier',
    tag: 'COUTURE WORKSPACE · DESIGN',
    description: 'Where sketches become garments through thoughtful tailoring, careful draping, and hand finishing.',
    extendedStory: 'Step behind the velvet curtain of Bubu Lagos. Here, initial moodboards and hand-drawn fashion illustrations transform into living heirlooms through rigorous fitting sessions and pin-drop precision.',
    details: [
      { label: 'Location', value: 'Lekki Phase 1, Lagos' },
      { label: 'Process', value: 'Sketch to Couture' },
      { label: 'Quality Check', value: '3-Stage Inspection' },
    ],
    src: 'https://res.cloudinary.com/dwmz4youk/video/upload/v1785883062/bubu_cta/WhatsApp_Video_2026-08-04_at_11.21.20_PM.mp4',
    type: 'video',
    alt: 'Luxury atelier workspace with draping dress forms and tailoring tools'
  },
  {
    id: 'luxury-details',
    title: 'Luxury in Every Detail',
    tag: 'EMBROIDERY & BEADWORK · FINISH',
    description: 'From delicate beadwork to carefully selected fabrics, every finish is chosen to create timeless pieces.',
    extendedStory: 'True luxury lives in subtle, intimate accents—custom brass toggles, hand-applied glass bead embroidery, and hidden interior linings that feel like a gentle embrace against the skin.',
    details: [
      { label: 'Embroidery', value: 'Hand-strung Beadwork' },
      { label: 'Hardware', value: 'Solid Sculpted Brass' },
      { label: 'Lining', value: 'Soft Breathable Cotton-Silk' },
    ],
    src: 'https://res.cloudinary.com/dwmz4youk/image/upload/v1785883049/bubu_cta/WhatsApp_Image_2026-08-04_at_11.21.13_PM_1.jpg',
    type: 'image',
    alt: 'Close-up of intricate hand-beaded embroidery details on fine fabric'
  },
  {
    id: 'inspired-by-lagos',
    title: 'Inspired by Lagos',
    tag: 'CULTURAL INSPIRATION · SOPHISTICATION',
    description: 'Vibrant culture, confident women, and modern African sophistication inspire every collection.',
    extendedStory: 'Lagos is energy, poise, and undeniable presence. Our designs reflect the city’s vibrant contrast—from golden Atlantic sunsets to high-society galas along Admiralty Way.',
    details: [
      { label: 'Muse', value: 'The Modern Lagosian' },
      { label: 'Palette', value: 'Warm Earth & Ocean Emerald' },
      { label: 'Vibe', value: 'Effortless Royalty' },
    ],
    src: 'https://res.cloudinary.com/dwmz4youk/video/upload/v1785883067/bubu_cta/WhatsApp_Video_2026-08-04_at_11.21.21_PM.mp4',
    type: 'video',
    alt: 'Confident modern African woman in editorial high fashion portrait'
  },
  {
    id: 'quiet-luxury',
    title: 'Quiet Luxury',
    tag: 'TIMELESS WEAR · HEIRLOOM',
    description: 'Understated elegance designed to be worn, remembered, and passed on for years to come.',
    extendedStory: 'Bubu Lagos transcends seasonal trends. We create investment garments that gain sentimental depth over time, designed to grace family portraits and momentous celebrations for generations.',
    details: [
      { label: 'Lifespan', value: 'Heirloom Quality' },
      { label: 'Care', value: 'Dry Clean & Soft Storage' },
      { label: 'Edition', value: 'Limited Atelier Runs' },
    ],
    src: 'https://res.cloudinary.com/dwmz4youk/image/upload/v1785883051/bubu_cta/WhatsApp_Image_2026-08-04_at_11.21.13_PM_2.jpg',
    type: 'image',
    alt: 'Understated elegance in neutral silk drape portrait'
  }
];

export function AtelierEditSection() {
  const [selected, setSelected] = useState(0);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const carouselContainerRef = useRef(null);
  const captionRef = useRef(null);

  const frameRef = useRef(null);
  const cardRefs = useRef([]);
  const posRef = useRef(0);
  const targetRef = useRef(0);
  const widthRef = useRef(0);
  const rafRef = useRef(null);
  const dragRef = useRef(null);

  const count = ATELIER_SLIDES.length;
  const rotate = 38;
  const depth = 0.55;
  const falloff = 0.58;
  const fade = 0.12;
  const gap = 0.06;
  const perspective = 3.2;

  const indexAt = useCallback(
    (pos) => ((Math.round(pos) % count) + count) % count,
    [count]
  );

  const paint = useCallback(() => {
    const width = widthRef.current;
    if (!width) return;
    const pitch = width * (1 + gap);
    const pos = posRef.current;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;

      let offset = index - pos;
      offset = ((offset % count) + count) % count;
      if (offset > count / 2) offset -= count;

      const distance = Math.abs(offset);
      const ramp = Math.pow(distance, falloff);
      const tilt = Math.min(rotate * ramp, 78) * Math.sign(offset);

      card.style.transform =
        `translateX(calc(-50% + ${offset * pitch}px)) ` +
        `translateZ(${-depth * width * ramp}px) rotateY(${-tilt}deg)`;

      const edge = Math.min(1, Math.max(0, count / 2 - distance));
      card.style.opacity = String(Math.max(0, 1 - fade * distance) * edge);
      card.style.zIndex = String(100 - Math.round(distance));
    });
  }, [count, depth, fade, falloff, gap, rotate]);

  const settle = useCallback(
    (target) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      targetRef.current = target;
      setSelected(indexAt(target));

      const step = () => {
        const remaining = target - posRef.current;
        if (Math.abs(remaining) < 0.0004) {
          posRef.current = target;
          paint();
          rafRef.current = null;
          return;
        }
        posRef.current += remaining * 0.14;
        paint();
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [indexAt, paint]
  );

  const goTo = useCallback(
    (index) => {
      const target = index + Math.round((targetRef.current - index) / count) * count;
      settle(target);
    },
    [count, settle]
  );

  const nudge = useCallback(
    (by) => settle(Math.round(targetRef.current) + by),
    [settle]
  );

  const onPointerDown = (event) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    targetRef.current = posRef.current;
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      pos: posRef.current,
      v: 0,
      t: performance.now(),
    };
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;

    const pitch = widthRef.current * (1 + gap);
    if (!pitch) return;

    const now = performance.now();
    const previous = posRef.current;
    posRef.current = drag.pos - (event.clientX - drag.x) / pitch;
    drag.v = ((posRef.current - previous) / Math.max(now - drag.t, 1)) * 1000;
    drag.t = now;

    const index = indexAt(posRef.current);
    if (index !== selected) setSelected(index);
    paint();
  };

  const endDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    const carried = Math.max(-2, Math.min(2, drag.v * 0.18));
    settle(Math.round(posRef.current + carried));
  };

  useIsoLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => {
      const card = cardRefs.current[0];
      if (!card) return;
      widthRef.current = card.offsetWidth;
      paint();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [paint]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // GSAP Animations on scroll
  useEffect(() => {
    if (reduceMotion || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      // Header reveal animation
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current.children,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.15,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: headerRef.current,
              start: 'top 85%',
              toggleActions: 'play none none none'
            }
          }
        );
      }

      // Carousel entrance animation
      if (carouselContainerRef.current) {
        gsap.fromTo(
          carouselContainerRef.current,
          { opacity: 0, scale: 0.96, y: 40 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: carouselContainerRef.current,
              start: 'top 80%',
              toggleActions: 'play none none none'
            }
          }
        );
      }

      // Caption reveal
      if (captionRef.current) {
        gsap.fromTo(
          captionRef.current,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: captionRef.current,
              start: 'top 90%',
              toggleActions: 'play none none none'
            }
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [reduceMotion]);

  const activeSlide = ATELIER_SLIDES[selected];

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-[#ede5da] text-[#32150d] py-20 md:py-28 border-t border-[#32150d]/10"
      style={{
        backgroundImage: `
          radial-gradient(#32150d 0.65px, transparent 0.65px),
          linear-gradient(180deg, rgba(237, 229, 218, 0.95) 0%, rgba(228, 217, 204, 0.98) 100%)
        `,
        backgroundSize: '24px 24px, 100% 100%',
        backgroundPosition: '0 0, 0 0'
      }}
    >
      {/* Subtle luxury ambient texture glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-1/4 h-[500px] w-[500px] rounded-full bg-[#0F3D2E]/5 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 left-1/4 h-[500px] w-[500px] rounded-full bg-[#32150d]/5 blur-[120px]"
      />

      <div className="max-w-[1400px] mx-auto px-5 md:px-8 relative z-10">
        {/* EDITORIAL INTRODUCTION */}
        <div ref={headerRef} className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#32150d]/5 border border-[#32150d]/15 text-[10px] font-bold uppercase tracking-[0.28em] text-[#0F3D2E] mb-4">
            <Feather size={12} className="text-[#0F3D2E]" />
            Editorial Lookbook
          </div>

          <h2 className="font-heading text-3xl md:text-5xl lg:text-6xl font-bold uppercase tracking-[0.18em] leading-[0.95] text-[#32150d] mb-4">
            THE ATELIER EDIT
          </h2>

          <p className="text-sm md:text-base text-[#32150d]/80 leading-[1.8] max-w-xl mx-auto mb-6 font-primary">
            An intimate look into the craftsmanship, movement, and elegance behind every Bubu Lagos piece.
          </p>

          <button
            onClick={() => setIsStoryModalOpen(true)}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#0F3D2E] hover:text-[#32150d] transition-colors py-2 border-b border-[#0F3D2E]/40 hover:border-[#32150d] group"
          >
            <span>Explore Story</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
          </button>
        </div>

        {/* 3D COVERFLOW CAROUSEL */}
        <div ref={carouselContainerRef} className="relative w-full max-w-5xl mx-auto">
          <div
            ref={frameRef}
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                nudge(-1);
              } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                nudge(1);
              }
            }}
            className="cursor-grab overflow-hidden py-12 md:py-16 outline-none ring-offset-0 focus-visible:ring-1 focus-visible:ring-[#0F3D2E] active:cursor-grabbing select-none"
            style={{
              perspective: `calc(clamp(240px, 38.4vw, 408px) * ${perspective})`,
              touchAction: 'pan-y',
            }}
            role="region"
            aria-roledescription="carousel"
            aria-label="The Atelier Edit Carousel"
          >
            <div
              className="relative select-none"
              style={{
                height: 'clamp(300px, 48vw, 480px)',
                transformStyle: 'preserve-3d',
              }}
            >
              {ATELIER_SLIDES.map((slide, index) => {
                const isActive = index === selected;
                const isVideo = slide.type === 'video' || slide.src.endsWith('.mp4');
                const posterSrc = isVideo ? getCloudinaryVideoPoster(slide.src) : slide.src;
                const videoSrc = isVideo ? getCloudinaryOptimizedVideo(slide.src) : null;

                return (
                  <div
                    key={slide.id}
                    ref={(node) => {
                      cardRefs.current[index] = node;
                    }}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${index + 1} of ${count}`}
                    onClick={() => {
                      if (isActive) {
                        setIsStoryModalOpen(true);
                      } else {
                        goTo(index);
                      }
                    }}
                    className={`absolute left-1/2 top-0 aspect-[4/5] overflow-hidden rounded-md shadow-2xl transition-shadow duration-500 cursor-pointer ${
                      isActive ? 'ring-1 ring-[#0F3D2E]/40 shadow-emerald-950/20' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      width: 'clamp(240px, 38.4vw, 384px)',
                      height: 'clamp(300px, 48vw, 480px)',
                    }}
                  >
                    {isVideo && isActive ? (
                      <video
                        src={videoSrc}
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="none"
                        className="h-full w-full select-none object-cover transition-transform duration-700 hover:scale-105"
                      />
                    ) : (
                      <img
                        src={posterSrc}
                        alt={slide.alt}
                        draggable={false}
                        loading={index < 3 ? "eager" : "lazy"}
                        className="h-full w-full select-none object-cover transition-transform duration-700 hover:scale-105"
                        onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#32150d]/80 via-transparent to-transparent opacity-80" />

                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ede5da]/80 block mb-1">
                        {slide.tag.split('·')[0]}
                      </span>
                      <p className="font-heading text-sm md:text-base font-bold uppercase tracking-wider line-clamp-1">
                        {slide.title}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CAROUSEL NAVIGATION CONTROLS */}
          <button
            type="button"
            aria-label="Previous story slide"
            onClick={() => nudge(-1)}
            className="absolute left-1 sm:left-4 top-1/2 z-30 -translate-y-1/2 rounded-full bg-[#32150d]/80 text-[#ede5da] p-3 shadow-lg backdrop-blur-md transition-all hover:bg-[#0F3D2E] hover:scale-110 active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            aria-label="Next story slide"
            onClick={() => nudge(1)}
            className="absolute right-1 sm:right-4 top-1/2 z-30 -translate-y-1/2 rounded-full bg-[#32150d]/80 text-[#ede5da] p-3 shadow-lg backdrop-blur-md transition-all hover:bg-[#0F3D2E] hover:scale-110 active:scale-95"
          >
            <ChevronRight size={20} />
          </button>

          {/* PAGINATION DOTS */}
          <div className="mt-4 flex items-center justify-center gap-2.5">
            {ATELIER_SLIDES.map((slide, index) => (
              <button
                key={`dot-${slide.id}`}
                type="button"
                aria-label={`Go to slide ${index + 1}: ${slide.title}`}
                aria-current={index === selected}
                onClick={() => goTo(index)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  index === selected
                    ? 'w-8 bg-[#0F3D2E]'
                    : 'w-2 bg-[#32150d]/25 hover:bg-[#32150d]/50'
                }`}
              />
            ))}
          </div>
        </div>

        {/* ACTIVE SLIDE EDITORIAL CAPTION */}
        <div ref={captionRef} className="mt-8 md:mt-12 text-center max-w-2xl mx-auto px-4 min-h-[120px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center"
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#0F3D2E] mb-2">
                {activeSlide.tag}
              </span>

              <h3 className="font-heading text-2xl md:text-3xl font-bold uppercase tracking-widest text-[#32150d] mb-3">
                {activeSlide.title}
              </h3>

              <p className="text-xs md:text-sm text-[#32150d]/85 leading-[1.8] max-w-xl mx-auto mb-4 font-primary">
                {activeSlide.description}
              </p>

              {/* Metadata Badges */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {activeSlide.details.map((item) => (
                  <span
                    key={item.label}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#32150d]/5 text-[#32150d] text-[10px] font-medium tracking-wider rounded-full border border-[#32150d]/10"
                  >
                    <span className="opacity-60">{item.label}:</span>
                    <span className="font-bold">{item.value}</span>
                  </span>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* EXTENDED EDITORIAL STORY MODAL */}
      <AnimatePresence>
        {isStoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStoryModalOpen(false)}
              className="fixed inset-0 bg-[#32150d]/70 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-3xl bg-[#ede5da] text-[#32150d] rounded-sm shadow-2xl border border-[#32150d]/20 overflow-hidden z-10 my-8"
              style={{
                backgroundImage: `radial-gradient(#32150d 0.5px, transparent 0.5px), linear-gradient(180deg, #ede5da 0%, #e5dad0 100%)`,
                backgroundSize: '20px 20px, 100% 100%',
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsStoryModalOpen(false)}
                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-[#32150d] text-[#ede5da] hover:bg-[#0F3D2E] transition-colors"
                aria-label="Close editorial story modal"
              >
                <X size={18} />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Image / Video Media */}
                <div className="relative aspect-[4/5] md:aspect-auto overflow-hidden bg-[#32150d]">
                  {activeSlide.type === 'video' || activeSlide.src.endsWith('.mp4') ? (
                    <video
                      src={activeSlide.src}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={activeSlide.src}
                      alt={activeSlide.alt}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#32150d]/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#ede5da]/80">
                      Bubu Lagos Magazine
                    </span>
                    <p className="font-heading text-lg font-bold uppercase tracking-wider">
                      Atelier Chapter {selected + 1} of {count}
                    </p>
                  </div>
                </div>

                {/* Editorial Content */}
                <div className="p-6 md:p-8 flex flex-col justify-between">
                  <div>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-[0.25em] text-[#0F3D2E] mb-2">
                      {activeSlide.tag}
                    </span>
                    <h3 className="font-heading text-2xl md:text-3xl font-bold uppercase tracking-widest text-[#32150d] mb-4">
                      {activeSlide.title}
                    </h3>
                    <p className="text-xs md:text-sm text-[#32150d]/85 leading-[1.8] font-primary mb-4">
                      {activeSlide.description}
                    </p>
                    <p className="text-xs text-[#32150d]/75 leading-[1.8] font-primary italic border-l-2 border-[#0F3D2E] pl-3 py-1 mb-6">
                      "{activeSlide.extendedStory}"
                    </p>

                    <div className="space-y-2 border-t border-[#32150d]/15 pt-4">
                      {activeSlide.details.map((detail) => (
                        <div key={detail.label} className="flex justify-between text-xs font-primary">
                          <span className="text-[#32150d]/60">{detail.label}</span>
                          <span className="font-bold text-[#32150d]">{detail.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-between pt-4 border-t border-[#32150d]/15">
                    <div className="flex gap-2">
                      <button
                        onClick={() => nudge(-1)}
                        className="px-3 py-1.5 bg-[#32150d]/10 hover:bg-[#32150d] hover:text-white rounded text-xs transition-colors font-bold uppercase tracking-wider"
                      >
                        ← Prev
                      </button>
                      <button
                        onClick={() => nudge(1)}
                        className="px-3 py-1.5 bg-[#32150d]/10 hover:bg-[#32150d] hover:text-white rounded text-xs transition-colors font-bold uppercase tracking-wider"
                      >
                        Next →
                      </button>
                    </div>

                    <button
                      onClick={() => setIsStoryModalOpen(false)}
                      className="text-xs font-bold uppercase tracking-widest text-[#0F3D2E] hover:underline"
                    >
                      Return to Atelier
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
