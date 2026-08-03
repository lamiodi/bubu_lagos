import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

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
  contact: [
    { href: 'mailto:concierge@bubulagos.com', label: 'Email: concierge@bubulagos.com' },
    { href: 'https://instagram.com/bubulagos', label: 'Instagram: @bubulagos', external: true },
    { to: '/contact', label: 'Book Atelier Appointment' },
  ],
  help: [
    { to: '/account', label: 'My Account' },
    { to: '/track-order', label: 'Track Your Order' },
    { to: '/contact', label: 'Client Concierge' },
    { to: '/contact', label: 'Shipping & Returns' },
    { to: '/contact', label: 'Terms of Service' },
    { to: '/contact', label: 'Privacy Policy' },
  ],
  gift: [
    { to: '/gift-card', label: 'Send Digital Gift Card' },
    { to: '/gift-card', label: 'Redeem Gift Card' },
  ],
};

const SOCIAL_LINKS = [
  { href: 'https://facebook.com/bubulagos', label: 'Facebook' },
  { href: 'https://instagram.com/bubulagos', label: 'Instagram' },
  { href: 'https://youtube.com/@bubulagos', label: 'Youtube' },
  { href: 'https://tiktok.com/@bubulagos', label: 'Tik Tok' },
];

// [MOTION ADDED] Footer is now black-on-white. All text is white; links get
// the accent color on hover so the brand accent is visible site-wide.
const headingClass = "text-[12px] font-semibold uppercase tracking-[0.12em] mb-4 text-white/90";
const linkClass = "text-[12px] text-white/70 hover:text-accent transition-colors duration-200";

export function Footer() {
  const [email, setEmail] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const reduceMotion = useReducedMotion();

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!privacyAccepted) {
      toast.error('Please accept the privacy policy');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/marketing/subscribe', { email });
      toast.success('Thank you for subscribing!');
      setEmail('');
      setPrivacyAccepted(false);
    } catch (err) {
      toast.error(err.message || 'Failed to subscribe');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-black text-white">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-16 pb-6">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-16"
          initial={reduceMotion ? false : 'hidden'}
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
          }}
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }}>
            <h3 className="font-heading text-[20px] font-bold uppercase tracking-[0.03em] mb-4 leading-[1.1] text-white">
              Sign Up For The Newsletter
            </h3>
            <form className="flex mb-4" onSubmit={handleNewsletterSubmit}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail*"
                className="flex-1 px-4 py-2.5 border border-white/40 text-[12px] text-white placeholder:text-white/50 focus:border-accent focus:outline-none bg-transparent transition-colors"
                required
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 border border-white/40 border-l-0 text-[12px] font-medium uppercase tracking-[0.03em] text-white hover:bg-accent hover:border-accent transition-colors duration-200 disabled:opacity-50"
              >
                {isSubmitting ? '...' : 'OK'}
              </button>
            </form>
            <label className="flex items-start gap-2 text-[10px] text-white/60 cursor-pointer leading-[1.4]">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                className="mt-[2px] accent-[#0F3D2E]"
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
              {FOOTER_LINKS.help.map((link) => (
                <Link key={link.label} to={link.to} className={linkClass}>
                  {link.label}
                </Link>
              ))}
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

          <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }}>
            <h4 className={headingClass}>The Gift Card</h4>
            <div className="flex flex-col gap-2">
              {FOOTER_LINKS.gift.map((link) => (
                <Link key={link.label} to={link.to} className={linkClass}>
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        </motion.div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-6 border-t border-white/15 gap-4">
          <div className="flex gap-5">
            {SOCIAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[12px] text-white/80 hover:text-accent transition-colors duration-200"
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

        <div className="mt-4 text-[10px] text-white/40 text-center md:text-left">
          © {new Date().getFullYear()} Bubu Lagos — All rights reserved.
        </div>
      </div>
    </footer>
  );
}
