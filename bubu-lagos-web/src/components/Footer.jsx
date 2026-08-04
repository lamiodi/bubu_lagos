import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { SizeGuideModal } from './SizeGuideModal';
import { Check } from 'lucide-react';

const FOOTER_LINKS = {
  categories: [
    { to: '/shop?category=bubus', label: 'Bubus' },
    { to: '/shop?category=turbans-geles', label: 'Turbans & Gelès' },
    { to: '/shop?category=artisan-accessories', label: 'Artisan Accessories' },
  ],
  collections: [
    { to: '/shop?collection=new-arrivals', label: 'New Arrivals' },
    { to: '/shop?collection=signature-bubu', label: 'Signature Bubu' },
    { to: '/shop?collection=hand-beaded-collection', label: 'Hand-Beaded Collection' },
    { to: '/shop?collection=best-sellers', label: 'Best Sellers' },
  ],
  help: [
    { to: '/track-order', label: 'My Account' },
    { to: '/track-order', label: 'Track Your Order' },
    { action: 'sizeGuide', label: 'Atelier Size Guide' },
    { to: '/gift-card', label: 'Digital Gift Cards' },
    { to: '/contact', label: 'Shipping & Returns' },
    { to: '/contact', label: 'Privacy Policy' },
  ],
  contact: [
    { href: 'mailto:Wodibenuah@yahoo.com', label: 'Email Concierge' },
    { href: 'https://instagram.com/bubulagos', label: 'Instagram: @bubulagos', external: true },
    { to: '/contact', label: 'Atelier Appointment' },
  ],
};

const SOCIAL_LINKS = [
  { href: 'https://instagram.com/bubulagos', label: 'Instagram', external: true },
];

const headingClass = "text-[12px] font-semibold uppercase tracking-[0.12em] mb-4 text-white/90";
const linkClass = "text-[12px] text-white/70 hover:text-accent transition-colors duration-200 text-left";

export function Footer() {
  const [email, setEmail] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const toast = useToast();
  const reduceMotion = useReducedMotion();

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!privacyAccepted) {
      toast.error('Please accept the privacy policy');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/marketing/subscribe', { email });
      toast.success('Thank you for subscribing to Bubu Lagos Atelier!');
      setEmail('');
      setPrivacyAccepted(false);
    } catch (err) {
      toast.error(err.message || 'Failed to subscribe. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-black text-white overflow-hidden border-t border-white/10">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 pt-12 sm:pt-16 pb-8">
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 sm:gap-10 mb-12 sm:mb-16"
          initial={reduceMotion ? false : 'hidden'}
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
          }}
        >
          {/* Newsletter Column - Spans 2 columns on lg screens */}
          <motion.div
            className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-2 pr-0 lg:pr-6"
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }}
          >
            <h3 className="font-heading text-[18px] sm:text-[20px] font-bold uppercase tracking-[0.03em] mb-3 leading-[1.2] text-white">
              Sign Up For The Newsletter
            </h3>
            <p className="text-[12px] text-white/60 mb-4 leading-relaxed max-w-sm">
              Subscribe to receive private updates, seasonal releases, and atelier invitations.
            </p>
            <form className="flex w-full max-w-md mb-3" onSubmit={handleNewsletterSubmit}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail*"
                className="w-full min-w-0 flex-1 px-4 py-3 border border-white/30 text-[12px] text-white placeholder:text-white/40 focus:border-accent focus:outline-none bg-transparent transition-colors rounded-l-none"
                required
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-shrink-0 px-6 py-3 border border-white/30 border-l-0 text-[12px] font-semibold uppercase tracking-[0.08em] text-white hover:bg-accent hover:border-accent transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isSubmitting ? '...' : 'OK'}
              </button>
            </form>
            <label className="flex items-start gap-2.5 text-[10px] text-white/60 cursor-pointer leading-[1.4] max-w-md">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                className="mt-0.5 accent-accent flex-shrink-0"
              />
              <span>I have read and accept the Bubu Lagos Privacy Policy.</span>
            </label>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }}>
            <h4 className={headingClass}>Product Categories</h4>
            <div className="flex flex-col gap-2">
              {FOOTER_LINKS.categories.map((link) => (
                <Link key={link.label} to={link.to} className={linkClass}>
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }}>
            <h4 className={headingClass}>Collections</h4>
            <div className="flex flex-col gap-2">
              {FOOTER_LINKS.collections.map((link) => (
                <Link key={link.label} to={link.to} className={linkClass}>
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }}>
            <h4 className={headingClass}>Client Services</h4>
            <div className="flex flex-col gap-2">
              {FOOTER_LINKS.help.map((link) => {
                if (link.action === 'sizeGuide') {
                  return (
                    <button
                      key={link.label}
                      type="button"
                      onClick={() => setShowSizeGuide(true)}
                      className={linkClass}
                    >
                      {link.label}
                    </button>
                  );
                }
                return (
                  <Link key={link.label} to={link.to} className={linkClass}>
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }}>
            <h4 className={headingClass}>Concierge</h4>
            <div className="flex flex-col gap-2">
              {FOOTER_LINKS.contact.map((link) => {
                if (link.to) {
                  return (
                    <Link key={link.label} to={link.to} className={linkClass}>
                      {link.label}
                    </Link>
                  );
                }
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    className={linkClass}
                    {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {link.label}
                  </a>
                );
              })}
            </div>
          </motion.div>
        </motion.div>

        <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-white/15 gap-4">
          <div className="flex gap-5">
            {SOCIAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-white/80 hover:text-accent transition-colors duration-200 font-medium"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4 text-[12px] text-white/80">
            <span className="flex items-center gap-1.5">
              <span className="text-base leading-none">🇳🇬</span>
              <span>Nigeria</span>
            </span>
            <span>English ▾</span>
          </div>
        </div>

        <div className="mt-4 text-[10px] text-white/40 text-center sm:text-left">
          © {new Date().getFullYear()} Bubu Lagos. All rights reserved.
        </div>
      </div>

      <SizeGuideModal open={showSizeGuide} onClose={() => setShowSizeGuide(false)} />
    </footer>
  );
}
