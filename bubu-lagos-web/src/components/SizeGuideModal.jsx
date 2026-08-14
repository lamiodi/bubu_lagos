import { useState } from 'react';
import { Modal } from './Modal';
import { Ruler, Sparkles, HelpCircle, Check, Info, Shirt, Layers, HeartHandshake } from 'lucide-react';
import { cn } from '../lib/utils';

// Universal One Size (Fits 8 - 20) conversion breakdown
const UNIVERSAL_SIZE_MAPPING = [
  { uk: 'UK 8 - 10', us: 'US 4 - 6', eu: 'EU 36 - 38', fitDescription: 'Generous & Dramatic Drape', silhouetteNote: 'Voluminous, ultra-relaxed fluid silhouette with maximum movement' },
  { uk: 'UK 12 - 14', us: 'US 8 - 10', eu: 'EU 40 - 42', fitDescription: 'Signature Fluid Flow', silhouetteNote: 'Classic Bubu elegance, graceful sweeping fall across bust and hips' },
  { uk: 'UK 16 - 18', us: 'US 12 - 14', eu: 'EU 44 - 46', fitDescription: 'Tailored Regal Comfort', silhouetteNote: 'Effortless drape that accentuates posture with zero restrictive seams' },
  { uk: 'UK 20', us: 'US 16', eu: 'EU 48', fitDescription: 'Flattering Structured Fit', silhouetteNote: 'Comfortable, unrestricted movement with elegant neckline framing' },
];

const SIZE_CHART = [
  { size: 'One Size (Fits 8 - 20)', uk: '8 - 20', us: '4 - 16', bustIn: '34 - 52', waistIn: 'Free / Flowing', hipsIn: 'Free / Flowing', lengthIn: '60 - 62', bustCm: '86 - 132', waistCm: 'Free / Flowing', hipsCm: 'Free / Flowing', lengthCm: '152 - 157', isUniversal: true },
  { size: 'XS', uk: '6', us: '2', bustIn: '31 - 33', waistIn: '24 - 26', hipsIn: '34 - 36', lengthIn: '58 - 60', bustCm: '78 - 83', waistCm: '61 - 66', hipsCm: '86 - 91', lengthCm: '147 - 152' },
  { size: 'S', uk: '8', us: '4', bustIn: '33 - 35', waistIn: '26 - 28', hipsIn: '36 - 38', lengthIn: '58 - 60', bustCm: '84 - 89', waistCm: '67 - 71', hipsCm: '92 - 97', lengthCm: '147 - 152' },
  { size: 'M', uk: '10 - 12', us: '6 - 8', bustIn: '36 - 38', waistIn: '29 - 31', hipsIn: '39 - 41', lengthIn: '60 - 62', bustCm: '91 - 97', waistCm: '74 - 79', hipsCm: '99 - 104', lengthCm: '152 - 157' },
  { size: 'L', uk: '14', us: '10', bustIn: '39 - 41', waistIn: '32 - 34', hipsIn: '42 - 44', lengthIn: '60 - 62', bustCm: '99 - 104', waistCm: '81 - 86', hipsCm: '107 - 112', lengthCm: '152 - 157' },
  { size: 'XL', uk: '16', us: '12', bustIn: '42 - 44', waistIn: '35 - 37', hipsIn: '45 - 47', lengthIn: '62', bustCm: '107 - 112', waistCm: '89 - 94', hipsCm: '114 - 119', lengthCm: '157' },
  { size: 'XXL', uk: '18 - 20', us: '14 - 16', bustIn: '45 - 48', waistIn: '38 - 41', hipsIn: '48 - 51', lengthIn: '62', bustCm: '114 - 122', waistCm: '97 - 104', hipsCm: '122 - 130', lengthCm: '157' },
  { size: '3XL', uk: '22', us: '18', bustIn: '49 - 52', waistIn: '42 - 45', hipsIn: '52 - 55', lengthIn: '62', bustCm: '124 - 132', waistCm: '107 - 114', hipsCm: '132 - 140', lengthCm: '157' },
];

export function SizeGuideModal({ open, onClose, selectedSize }) {
  const [unit, setUnit] = useState('in'); // 'in' | 'cm'
  const [activeTab, setActiveTab] = useState('universal'); // 'universal' | 'chart' | 'measuring'

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="2xl"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shadow-xs">
            <Ruler size={18} />
          </div>
          <div>
            <h2 className="text-xl font-heading font-black uppercase tracking-tight">Atelier Size &amp; Fit Guide</h2>
            <p className="text-xs text-text-light font-normal normal-case">Bubu Lagos silhouette architecture &amp; universal fit guide</p>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Navigation & Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-1.5 bg-background-light p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('universal')}
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5",
                activeTab === 'universal' ? "bg-white text-black shadow-xs font-black" : "text-text-light hover:text-black"
              )}
            >
              <Sparkles size={13} className={activeTab === 'universal' ? "text-accent" : ""} />
              One Size (Fits 8 - 20)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('chart')}
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                activeTab === 'chart' ? "bg-white text-black shadow-xs font-black" : "text-text-light hover:text-black"
              )}
            >
              Full Measurement Chart
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('measuring')}
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                activeTab === 'measuring' ? "bg-white text-black shadow-xs font-black" : "text-text-light hover:text-black"
              )}
            >
              How to Measure
            </button>
          </div>

          {activeTab !== 'measuring' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-text-light font-semibold uppercase tracking-wider text-[10px]">Units:</span>
              <div className="inline-flex rounded-lg border border-border p-0.5 bg-background-light">
                <button
                  type="button"
                  onClick={() => setUnit('in')}
                  className={cn(
                    "px-3 py-1 rounded-md text-[11px] font-bold transition-all",
                    unit === 'in' ? "bg-black text-white shadow-2xs" : "text-text-light hover:text-black"
                  )}
                >
                  Inches (&quot;)
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('cm')}
                  className={cn(
                    "px-3 py-1 rounded-md text-[11px] font-bold transition-all",
                    unit === 'cm' ? "bg-black text-white shadow-2xs" : "text-text-light hover:text-black"
                  )}
                >
                  CM
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab 1: Universal Fit Spotlight (One Size Fits 8 - 20) */}
        {activeTab === 'universal' && (
          <div className="space-y-6">
            {/* Spotlight Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-black via-zinc-900 to-stone-900 text-white p-6 rounded-2xl border border-black/10 shadow-md">
              <div className="relative z-10 space-y-3">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] font-bold tracking-widest uppercase text-amber-200">
                  <Sparkles size={12} />
                  Signature Atelier Fit Architecture
                </div>
                <h3 className="text-xl sm:text-2xl font-heading font-black tracking-tight uppercase">
                  One Size (Fits UK 8 – 20 / US 4 – 16)
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed max-w-2xl">
                  Bubu Lagos boubous and kaftans are engineered with an intentionally generous, fluid architectural cut. 
                  Designed to celebrate the female form with regal poise, our garments drape seamlessly across body types from 
                  <strong className="text-white"> UK 8 to UK 20</strong> without cling or constriction.
                </p>
              </div>
            </div>

            {/* Why It Fits Explained */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-background-light rounded-xl border border-border space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-black">
                  <Shirt size={15} className="text-accent flex-shrink-0" />
                  Drop-Shoulder Freedom
                </div>
                <p className="text-[11px] text-text-light leading-relaxed">
                  Relaxed, unconstructed armholes accommodate diverse shoulder widths and bust proportions effortlessly.
                </p>
              </div>

              <div className="p-4 bg-background-light rounded-xl border border-border space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-black">
                  <Layers size={15} className="text-accent flex-shrink-0" />
                  Seam-Free Torso Flow
                </div>
                <p className="text-[11px] text-text-light leading-relaxed">
                  Free-flowing waist and hip silhouette (up to 58&quot; / 147cm hip span) eliminates pinch points and tension.
                </p>
              </div>

              <div className="p-4 bg-background-light rounded-xl border border-border space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-black">
                  <HeartHandshake size={15} className="text-accent flex-shrink-0" />
                  Statuesque Length
                </div>
                <p className="text-[11px] text-text-light leading-relaxed">
                  Sweeping 60&quot;–62&quot; floor-length hem tailored for regal poise with heels, flats, or belted variations.
                </p>
              </div>
            </div>

            {/* Fit by Standard Size Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text flex items-center justify-between">
                <span>How &quot;One Size (Fits 8 - 20)&quot; Drapes On Your Body Size</span>
                <span className="text-[10px] text-text-light font-normal lowercase italic">standard international conversions</span>
              </h4>

              <div className="overflow-x-auto rounded-xl border border-border shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black text-white uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3 font-bold">Standard Size</th>
                      <th className="px-4 py-3 font-bold">US</th>
                      <th className="px-4 py-3 font-bold">EU</th>
                      <th className="px-4 py-3 font-bold">Fit Characteristic</th>
                      <th className="px-4 py-3 font-bold">Drape &amp; Movement Experience</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {UNIVERSAL_SIZE_MAPPING.map((item, idx) => (
                      <tr key={idx} className="hover:bg-background-light/80 transition-colors">
                        <td className="px-4 py-3 font-bold text-black">{item.uk}</td>
                        <td className="px-4 py-3 text-text-light font-medium">{item.us}</td>
                        <td className="px-4 py-3 text-text-light font-medium">{item.eu}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                            {item.fitDescription}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-light text-[11px] leading-relaxed">
                          {item.silhouetteNote}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Key Garment Measurements for One Size */}
            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/60 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-950">
                <Info size={16} className="text-accent flex-shrink-0" />
                <span>One Size Garment Dimensions</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-amber-200/40">
                  <span className="text-[10px] uppercase font-bold text-text-light block">Bust Span</span>
                  <span className="font-bold text-black text-sm">{unit === 'in' ? '34" – 52"' : '86 – 132 cm'}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-amber-200/40">
                  <span className="text-[10px] uppercase font-bold text-text-light block">Waist Cut</span>
                  <span className="font-bold text-black text-sm">{unit === 'in' ? 'Free / Fluid' : 'Free / Fluid'}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-amber-200/40">
                  <span className="text-[10px] uppercase font-bold text-text-light block">Hip Span</span>
                  <span className="font-bold text-black text-sm">{unit === 'in' ? 'Up to 58"' : 'Up to 147 cm'}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-amber-200/40">
                  <span className="text-[10px] uppercase font-bold text-text-light block">Garment Length</span>
                  <span className="font-bold text-black text-sm">{unit === 'in' ? '60" – 62"' : '152 – 157 cm'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Full Measurement Chart */}
        {activeTab === 'chart' && (
          <div className="space-y-5">
            <div className="overflow-x-auto rounded-xl border border-border shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-black text-white uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3 font-bold">Size</th>
                    <th className="px-4 py-3 font-bold">UK</th>
                    <th className="px-4 py-3 font-bold">US</th>
                    <th className="px-4 py-3 font-bold">Bust ({unit})</th>
                    <th className="px-4 py-3 font-bold">Waist ({unit})</th>
                    <th className="px-4 py-3 font-bold">Hips ({unit})</th>
                    <th className="px-4 py-3 font-bold">Length ({unit})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {SIZE_CHART.map((row) => {
                    const isSelectedSize = selectedSize && (
                      row.size.toUpperCase() === selectedSize.toUpperCase() ||
                      (selectedSize.toUpperCase().includes('ONE SIZE') && row.isUniversal)
                    );
                    return (
                      <tr
                        key={row.size}
                        className={cn(
                          "hover:bg-background-light transition-colors",
                          row.isUniversal && "bg-amber-50/70 font-semibold border-l-4 border-l-amber-500",
                          isSelectedSize && "bg-emerald-50/90 font-bold text-accent"
                        )}
                      >
                        <td className="px-4 py-3 font-bold text-text flex items-center gap-1.5">
                          {row.size}
                          {row.isUniversal && (
                            <span className="inline-flex items-center gap-1 bg-amber-200/60 text-amber-900 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              <Sparkles size={10} /> Universal
                            </span>
                          )}
                          {isSelectedSize && (
                            <span className="badge-accent text-[8px] py-0 px-1.5 ml-1">Selected</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-light">{row.uk}</td>
                        <td className="px-4 py-3 text-text-light">{row.us}</td>
                        <td className="px-4 py-3 text-text font-medium">
                          {unit === 'in' ? row.bustIn : row.bustCm}
                        </td>
                        <td className="px-4 py-3 text-text font-medium">
                          {unit === 'in' ? row.waistIn : row.waistCm}
                        </td>
                        <td className="px-4 py-3 text-text font-medium">
                          {unit === 'in' ? row.hipsIn : row.hipsCm}
                        </td>
                        <td className="px-4 py-3 text-text font-medium">
                          {unit === 'in' ? row.lengthIn : row.lengthCm}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Fit Advice Notice */}
            <div className="bg-background-light p-4 rounded-xl border border-border flex items-start gap-3">
              <Info size={18} className="text-accent flex-shrink-0 mt-0.5" />
              <div className="text-xs text-text-light space-y-1">
                <p className="font-bold text-text">Atelier Fit Recommendation</p>
                <p className="leading-relaxed">
                  Bubu Lagos signature kaftans and boubous are crafted with generous fluidity. If purchasing fitted capsule pieces and you fall between sizes, we recommend choosing the smaller size for a closer silhouette or the larger size for a relaxed drape.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: How to Measure */}
        {activeTab === 'measuring' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-background-light rounded-xl border border-border space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-text">
                  <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center font-mono">1</span>
                  Bust Measurement
                </div>
                <p className="text-xs text-text-light leading-relaxed">
                  Measure around the fullest part of your bust, keeping the measuring tape horizontal and comfortable across your back.
                </p>
              </div>

              <div className="p-4 bg-background-light rounded-xl border border-border space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-text">
                  <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center font-mono">2</span>
                  Waist Measurement
                </div>
                <p className="text-xs text-text-light leading-relaxed">
                  Measure around the narrowest part of your natural waistline (typically right above your navel).
                </p>
              </div>

              <div className="p-4 bg-background-light rounded-xl border border-border space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-text">
                  <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center font-mono">3</span>
                  Hips Measurement
                </div>
                <p className="text-xs text-text-light leading-relaxed">
                  Stand with feet together and measure around the fullest point of your hips and rear.
                </p>
              </div>

              <div className="p-4 bg-background-light rounded-xl border border-border space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-text">
                  <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center font-mono">4</span>
                  Garment Length
                </div>
                <p className="text-xs text-text-light leading-relaxed">
                  Measured vertically from the highest point of your shoulder straight down to the bottom hemline.
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-950 font-medium">
                <HelpCircle size={18} className="text-amber-800 flex-shrink-0" />
                <span>Need sizing consultation or bespoke hem alterations?</span>
              </div>
              <a
                href="https://wa.me/2348161331923"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-black uppercase tracking-wider text-[11px] underline hover:text-amber-800 transition-colors whitespace-nowrap"
              >
                Contact Concierge &rarr;
              </a>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="pt-4 border-t border-border flex items-center justify-between">
          <div className="text-[11px] text-text-light flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-600" />
            <span>Universal One Size fits UK 8 – 20 comfortably</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary px-6 py-2.5 text-xs"
          >
            Close Guide
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default SizeGuideModal;
