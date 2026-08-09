import { useState } from 'react';
import { Modal } from './Modal';
import { Ruler, Sparkles, HelpCircle, Check, Info } from 'lucide-react';
import { cn } from '../lib/utils';

const SIZE_CHART = [
  { size: 'XS', uk: '6', us: '2', bustIn: '31-33', waistIn: '24-26', hipsIn: '34-36', lengthIn: '58-60', bustCm: '78-83', waistCm: '61-66', hipsCm: '86-91', lengthCm: '147-152' },
  { size: 'S', uk: '8', us: '4', bustIn: '33-35', waistIn: '26-28', hipsIn: '36-38', lengthIn: '58-60', bustCm: '84-89', waistCm: '67-71', hipsCm: '92-97', lengthCm: '147-152' },
  { size: 'M', uk: '10 - 12', us: '6 - 8', bustIn: '36-38', waistIn: '29-31', hipsIn: '39-41', lengthIn: '60-62', bustCm: '91-97', waistCm: '74-79', hipsCm: '99-104', lengthCm: '152-157' },
  { size: 'L', uk: '14', us: '10', bustIn: '39-41', waistIn: '32-34', hipsIn: '42-44', lengthIn: '60-62', bustCm: '99-104', waistCm: '81-86', hipsCm: '107-112', lengthCm: '152-157' },
  { size: 'XL', uk: '16', us: '12', bustIn: '42-44', waistIn: '35-37', hipsIn: '45-47', lengthIn: '62', bustCm: '107-112', waistCm: '89-94', hipsCm: '114-119', lengthCm: '157' },
  { size: 'XXL', uk: '18 - 20', us: '14 - 16', bustIn: '45-48', waistIn: '38-41', hipsIn: '48-51', lengthIn: '62', bustCm: '114-122', waistCm: '97-104', hipsCm: '122-130', lengthCm: '157' },
  { size: '3XL', uk: '22', us: '18', bustIn: '49-52', waistIn: '42-45', hipsIn: '52-55', lengthIn: '62', bustCm: '124-132', waistCm: '107-114', hipsCm: '132-140', lengthCm: '157' },
  { size: 'Free Size', uk: '8 - 20', us: '4 - 16', bustIn: '33-48', waistIn: 'Flexible', hipsIn: 'Flexible', lengthIn: '60-62', bustCm: '84-122', waistCm: 'Flexible', hipsCm: 'Flexible', lengthCm: '152-157' },
];

export function SizeGuideModal({ open, onClose, selectedSize }) {
  const [unit, setUnit] = useState('in'); // 'in' | 'cm'
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'measuring'

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="2xl"
      title={
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center">
            <Ruler size={18} />
          </div>
          <div>
            <h2 className="text-xl font-heading font-black uppercase tracking-tight">Atelier Size Guide</h2>
            <p className="text-xs text-text-light font-normal normal-case">Bubu Lagos silhouette &amp; fit measurement chart</p>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Navigation & Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2 bg-background-light p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('chart')}
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors",
                activeTab === 'chart' ? "bg-white text-black shadow-2xs" : "text-text-light hover:text-black"
              )}
            >
              Size Chart
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('measuring')}
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors",
                activeTab === 'measuring' ? "bg-white text-black shadow-2xs" : "text-text-light hover:text-black"
              )}
            >
              How to Measure
            </button>
          </div>

          {activeTab === 'chart' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-text-light font-medium uppercase tracking-wider text-[10px]">Units:</span>
              <div className="inline-flex rounded-lg border border-border p-0.5 bg-background-light">
                <button
                  type="button"
                  onClick={() => setUnit('in')}
                  className={cn(
                    "px-3 py-1 rounded text-[11px] font-bold transition-all",
                    unit === 'in' ? "bg-black text-white shadow-2xs" : "text-text-light hover:text-black"
                  )}
                >
                  Inches (&quot;)
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('cm')}
                  className={cn(
                    "px-3 py-1 rounded text-[11px] font-bold transition-all",
                    unit === 'cm' ? "bg-black text-white shadow-2xs" : "text-text-light hover:text-black"
                  )}
                >
                  Centimeters (cm)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab 1: Size Chart Table */}
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
                      (selectedSize.toUpperCase() === 'FREE' && row.size === 'Free Size')
                    );
                    return (
                      <tr
                        key={row.size}
                        className={cn(
                          "hover:bg-background-light transition-colors",
                          row.size === 'Free Size' && "bg-amber-50/40 font-semibold",
                          isSelectedSize && "bg-emerald-50/80 font-bold text-accent"
                        )}
                      >
                        <td className="px-4 py-3 font-bold text-text flex items-center gap-1.5">
                          {row.size}
                          {row.size === 'Free Size' && (
                            <Sparkles size={13} className="text-amber-500 flex-shrink-0" />
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
                  Bubu Lagos signature kaftans and boubous feature a relaxed, fluid drape designed for elegance and maximum comfort.
                  If you fall between sizes or desire a more tailored silhouette, we recommend choosing one size down.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: How to Measure */}
        {activeTab === 'measuring' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-background-light rounded-xl border border-border space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-text">
                  <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center">1</span>
                  Bust Measurement
                </div>
                <p className="text-xs text-text-light leading-relaxed">
                  Measure around the fullest part of your bust, keeping the measuring tape horizontal and comfortable across your back.
                </p>
              </div>

              <div className="p-4 bg-background-light rounded-xl border border-border space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-text">
                  <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center">2</span>
                  Waist Measurement
                </div>
                <p className="text-xs text-text-light leading-relaxed">
                  Measure around the narrowest part of your natural waistline (typically above your belly button).
                </p>
              </div>

              <div className="p-4 bg-background-light rounded-xl border border-border space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-text">
                  <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center">3</span>
                  Hips Measurement
                </div>
                <p className="text-xs text-text-light leading-relaxed">
                  Stand with feet together and measure around the fullest point of your hips and rear.
                </p>
              </div>

              <div className="p-4 bg-background-light rounded-xl border border-border space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-text">
                  <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center">4</span>
                  Garment Length
                </div>
                <p className="text-xs text-text-light leading-relaxed">
                  Measured vertically from the highest point of the shoulder straight down to the bottom hemline.
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-900 font-medium">
                <HelpCircle size={16} className="text-amber-700 flex-shrink-0" />
                <span>Need a custom fit or tailored alterations?</span>
              </div>
              <a
                href="https://wa.me/2348161331923"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-black uppercase tracking-wider text-[11px] underline hover:text-amber-800 transition-colors"
              >
                Contact Concierge &rarr;
              </a>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="pt-4 border-t border-border flex justify-end">
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
