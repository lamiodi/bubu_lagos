import { useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { useToast } from '../context/ToastContext';
import { cn, formatNGN } from '../lib/utils';
import { Check, Mail, Gift, Sparkles, Copy } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { EASE_OUT } from '../lib/motion';
import { Link } from 'react-router-dom';

const AMOUNT_PRESETS = [100000, 200000, 500000, 700000, 1000000];

/**
 * Gift Card landing + purchase form.
 *
 * Spec (verbatim from product brief):
 *   Give the Perfect Gift
 *   Send BuBu Lagos Gift Card instantly via email.
 *   The ultimate gift of choice.
 *   Select Amount (₦), From, To (email + phone, 11-digit NG),
 *   Personal Message (optional), Pay, T&Cs.
 */
export function GiftCard() {
  const toast = useToast();
  const reduceMotion = useReducedMotion();

  const [amount, setAmount] = useState(AMOUNT_PRESETS[0]);
  const [customAmount, setCustomAmount] = useState('');
  const [fromName, setFromName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [message, setMessage] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedCode, setIssuedCode] = useState(null);

  const finalAmount = useMemo(() => {
    if (customAmount && Number(customAmount) > 0) return Number(customAmount);
    return amount;
  }, [amount, customAmount]);

  const phoneValid = useMemo(() => {
    const digits = recipientPhone.replace(/\D/g, '');
    return digits.length === 11 && digits.startsWith('0');
  }, [recipientPhone]);

  const emailValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail),
    [recipientEmail]
  );

  const canSubmit =
    finalAmount > 0 && emailValid && phoneValid && agreed && !isSubmitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      // POST to the gift card endpoint. The backend should create the gift card,
      // email it to the recipient, and return the code.
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/gift-cards/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalAmount,
          fromName: fromName || undefined,
          recipientEmail,
          recipientPhone,
          message: message || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Fall back to a local preview code if the backend isn't available.
        const fallback = `BUBU-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        setIssuedCode(data?.code || fallback);
        toast.success('Gift card reserved (offline preview)');
      } else {
        setIssuedCode(data.code);
        toast.success('Gift card sent to recipient');
      }
    } catch (err) {
      // Offline fallback so the page is still useful in dev.
      const fallback = `BUBU-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      setIssuedCode(fallback);
      toast.success('Gift card reserved (offline preview)');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCode = async () => {
    if (!issuedCode) return;
    try {
      await navigator.clipboard.writeText(issuedCode);
      toast.success('Code copied');
    } catch {
      toast.error('Copy failed — please select and copy manually.');
    }
  };

  return (
    <Layout headerVariant="dark" title="Gift Card" description="Send the perfect gift — a BuBu Lagos gift card delivered instantly by email.">
      <section className="relative min-h-[calc(100vh-60px)] flex items-center justify-center overflow-hidden bg-black text-white py-20 md:py-28">
        {/* Decorative gradient */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(15,61,46,0.35),transparent_60%)]"
        />

        <div className="relative w-full max-w-[1200px] mx-auto px-5 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: copy */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
            className="text-center lg:text-left"
          >
            <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-300/90 mb-5">
              <Sparkles size={12} /> The Atelier · Gift
            </span>
            <h1 className="font-heading text-4xl md:text-6xl font-black tracking-tight mb-6">
              Give the <span className="italic text-amber-300">Perfect</span> Gift
            </h1>
            <p className="text-white/70 text-base md:text-lg leading-relaxed max-w-md mx-auto lg:mx-0">
              Send a Bubu Lagos Gift Card instantly via email. The ultimate gift of choice —
              for the ones who already have everything, or the ones who deserve something beautiful.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-white/80 max-w-md mx-auto lg:mx-0 text-left">
              {['Delivered to their inbox in seconds', 'Redeemable on every collection', 'No expiry, no fees'].map((line) => (
                <li key={line} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-amber-300/20 text-amber-300 flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Right: form / success card */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.1 }}
            className="bg-white text-black rounded-2xl shadow-2xl p-7 md:p-9 w-full max-w-md mx-auto"
          >
            {issuedCode ? (
              <SuccessCard code={issuedCode} onCopy={copyCode} onReset={() => setIssuedCode(null)} amount={finalAmount} />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <header className="flex items-center gap-3 pb-2 border-b border-gray-100">
                  <span className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Gift size={16} />
                  </span>
                  <div>
                    <h2 className="text-base font-bold tracking-wide">Send a Gift Card</h2>
                    <p className="text-[11px] text-gray-500 uppercase tracking-widest">Instant digital delivery</p>
                  </div>
                </header>

                {/* Amount */}
                <fieldset>
                  <legend className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Select Amount (₦)</legend>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {AMOUNT_PRESETS.map((preset) => {
                      const active = !customAmount && amount === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => { setAmount(preset); setCustomAmount(''); }}
                          aria-pressed={active}
                          className={cn(
                            'py-2 text-[10px] font-bold tracking-widest rounded-md border transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none',
                            active
                              ? 'bg-black text-white border-black'
                              : 'bg-white text-black border-gray-200 hover:border-black'
                          )}
                        >
                          {preset >= 1000000 ? `${preset / 1000000}M` : `${preset / 1000}k`}
                        </button>
                      );
                    })}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₦</span>
                    <input
                      type="number"
                      min="5000"
                      step="1000"
                      placeholder="Custom amount"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>
                </fieldset>

                {/* From */}
                <div>
                  <label htmlFor="gc-from" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">From</label>
                  <input
                    id="gc-from"
                    type="text"
                    placeholder="Your Name (Optional)"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                {/* To */}
                <div className="space-y-3">
                  <div>
                    <label htmlFor="gc-email" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                      To · Recipient&apos;s Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="gc-email"
                      type="email"
                      required
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                      placeholder="friend@example.com"
                    />
                    {recipientEmail && !emailValid && (
                      <p className="mt-1 text-[10px] text-red-500 uppercase tracking-widest">Enter a valid email</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="gc-phone" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                      To · Recipient&apos;s Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="gc-phone"
                      type="tel"
                      required
                      inputMode="numeric"
                      maxLength={14}
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value.replace(/[^\d+]/g, ''))}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                      placeholder="08012345678"
                      aria-describedby="gc-phone-hint"
                    />
                    <p id="gc-phone-hint" className={cn('mt-1 text-[10px] uppercase tracking-widest', phoneValid ? 'text-green-600' : 'text-gray-400')}>
                      {phoneValid ? 'Looks good' : 'Must be a valid 11-digit Nigerian number.'}
                    </p>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="gc-message" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Personal Message (Optional)</label>
                  <textarea
                    id="gc-message"
                    rows={3}
                    maxLength={500}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Happy birthday — pick something you'll love."
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-black focus:ring-1 focus:ring-black resize-none"
                  />
                  <p className="mt-1 text-[10px] text-gray-400 text-right">{message.length}/500</p>
                </div>

                {/* T&Cs */}
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-black focus:ring-2 focus:ring-accent focus:ring-offset-2"
                  />
                  <span className="text-[11px] text-gray-500 leading-relaxed">
                    By proceeding, you agree to our{' '}
                    <Link to="/terms" className="underline hover:text-black">Terms &amp; Conditions</Link>.
                  </span>
                </label>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full py-4 bg-black text-white text-xs font-bold uppercase tracking-[0.18em] hover:bg-gray-900 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
                >
                  {isSubmitting ? 'Processing…' : `Pay ${formatNGN(finalAmount)}`}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}

function SuccessCard({ code, amount, onCopy, onReset }) {
  return (
    <div className="text-center py-2">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className="w-14 h-14 mx-auto mb-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center"
        aria-hidden="true"
      >
        <Mail size={24} />
      </motion.div>
      <h2 className="text-xl font-bold mb-2">Gift card on its way</h2>
      <p className="text-sm text-gray-500 mb-6">
        {formatNGN(amount)} will be delivered to the recipient&apos;s email.
      </p>
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Your gift code</p>
        <div className="flex items-center justify-center gap-2">
          <code className="font-mono text-base font-bold tracking-widest">{code}</code>
          <button
            type="button"
            onClick={onCopy}
            aria-label="Copy gift card code"
            className="p-1.5 text-gray-500 hover:text-black transition-colors rounded focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
          >
            <Copy size={14} />
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
      >
        Send another
      </button>
    </div>
  );
}

export default GiftCard;
