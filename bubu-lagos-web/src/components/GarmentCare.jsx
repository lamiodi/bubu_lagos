import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Wind, ShieldAlert, Package, ChevronDown } from 'lucide-react';

const CARE_SECTIONS = [
  {
    id: 'dry-cleaning',
    title: 'Dry Clean Recommended',
    icon: Sparkles,
    detail: 'To preserve the delicate lustre of raw silk, organza, hand-beaded trims, and metallic thread embroideries, professional dry cleaning is strongly recommended.'
  },
  {
    id: 'steaming',
    title: 'Steaming & Pressing',
    icon: Wind,
    detail: 'Garments should be smoothed using a low-heat garment steamer held at least 6 inches from the fabric. Never apply a hot direct iron over hand-placed sequins or delicate mesh.'
  },
  {
    id: 'storage',
    title: 'Atelier Storage',
    icon: Package,
    detail: 'Store free-flowing Bubu gowns on padded luxury coat hangers inside a breathable cotton garment bag away from direct sunlight to maintain vibrancy.'
  },
  {
    id: 'spot-care',
    title: 'Spill & Stain Care',
    icon: ShieldAlert,
    detail: 'In the event of a spill, gently press a dry cotton cloth to absorb moisture. Do not rub woven beads or gold threadwork as this can compromise fiber tension.'
  }
];

export default function GarmentCare({ className = '' }) {
  const [openId, setOpenId] = useState('dry-cleaning');

  return (
    <div className={`border-t border-b border-black/10 py-6 font-serif ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={16} className="text-accent" />
        <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-black">
          Atelier Care & Fabric Maintenance
        </h3>
      </div>
      <p className="text-xs text-gray-500 mb-4 font-sans leading-relaxed">
        Every Bubu Lagos garment is crafted using artisanal luxury textiles. Follow our curated care steps to ensure lifelong silhouette perfection.
      </p>

      <div className="space-y-2">
        {CARE_SECTIONS.map((item) => {
          const Icon = item.icon;
          const isOpen = openId === item.id;

          return (
            <div
              key={item.id}
              className="border border-black/5 rounded-lg overflow-hidden bg-background-light/40 transition-colors"
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="w-full flex items-center justify-between p-3.5 text-left text-xs font-medium text-black hover:bg-black/5 transition-colors font-sans"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={15} className="text-black/70 flex-shrink-0" />
                  <span className="font-semibold uppercase tracking-wider text-[11px]">
                    {item.title}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={14} className="text-gray-400" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="px-3.5 pb-3.5 pt-1 text-xs text-gray-600 font-sans leading-relaxed border-t border-black/5">
                      {item.detail}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
