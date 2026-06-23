import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

const FOOTER_LINKS = {
  contact: [
    { href: 'mailto:info@bubulagos.com', label: 'E-mail: info@bubulagos.com' },
    { href: 'https://instagram.com/bubulagos', label: 'Instagram: @bubulagos', external: true },
    { to: '/contact', label: 'Visit our Atelier' },
  ],
  help: [
    { to: '/account', label: 'My Account' },
    { to: '/contact', label: 'Contact Concierge' },
    { to: '/contact', label: 'Shipping and Returns' },
    { to: '/contact', label: 'Terms and Conditions of Sales' },
    { to: '/contact', label: 'Terms and Conditions of Use' },
    { to: '/contact', label: 'Privacy Policy' },
    { to: '/contact', label: 'Edit Cookies' },
  ],
  about: [
    { to: '/contact', label: 'Cookies' },
    { to: '/contact', label: 'Accessibility' },
    { to: '/contact', label: 'Our Engagements' },
  ],
  // [NEW] Quick link to the Gift Card purchase page.
  gift: [
    { to: '/gift-card', label: 'Send a Gift Card' },
    { to: '/contact', label: 'Redeem a Gift Card' },
  ],
};

const SOCIAL_LINKS = [
  { href: '#', label: 'Facebook' },
  { href: '#', label: 'Instagram' },
  { href: '#', label: 'Youtube' },
  { href: '#', label: 'Tik Tok' },
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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 mb-16"
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
            <h4 className={headingClass}>Contact Us</h4>
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
            <h4 className={headingClass}>The House</h4>
            <div className="flex flex-col gap-2">
              {FOOTER_LINKS.about.map((link) => (
                <Link key={link.label} to={link.to} className={linkClass}>
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }}>
            <h4 className={headingClass}>Gifting</h4>
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
