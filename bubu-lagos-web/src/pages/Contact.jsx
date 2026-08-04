import { Layout } from '../components/Layout';
import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import { FALLBACK_IMAGE } from '../lib/utils';
import { Send, MapPin, Phone, Mail } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

export function Contact() {
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();
    const reduceMotion = useReducedMotion();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await api.post('/contact', formData);
            toast.success('Your message has been sent. We will get back to you soon!');
            setFormData({
                name: '',
                email: '',
                phone: '',
                subject: '',
                message: ''
            });
        } catch (err) {
            toast.error(err.message || 'Failed to send message. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Layout headerVariant="solid">
            <div className="pt-[60px] min-h-screen bg-white">
                {/* Hero Section */}
                <section className="relative h-[40vh] bg-black overflow-hidden flex items-center justify-center">
                    <img
                        src={FALLBACK_IMAGE}
                        alt="Atelier"
                        className="absolute inset-0 w-full h-full object-cover opacity-50"
                    />
                    <div className="relative z-10 text-center">
                        {/* [MOTION ADDED] Hero headline + subtext stagger */}
                        <motion.h1
                            className="font-heading text-4xl md:text-6xl font-bold text-white uppercase tracking-widest mb-4"
                            initial={reduceMotion ? false : { opacity: 0, y: 48 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                        >
                            Contact Us
                        </motion.h1>
                        <motion.p
                            className="text-white/80 text-[10px] uppercase tracking-[0.2em]"
                            initial={reduceMotion ? false : { opacity: 0, y: 48 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
                        >
                            The Atelier & Concierge
                        </motion.p>
                    </div>
                </section>

                <section className="max-w-[1400px] mx-auto px-5 md:px-8 py-16 md:py-24">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-24">
                        {/* Contact Information */}
                        <div>
                            <h2 className="font-heading text-2xl md:text-3xl font-bold uppercase tracking-wider mb-8 border-b border-black pb-4">
                                Get In Touch
                            </h2>
                            <p className="text-sm text-gray-600 leading-relaxed mb-12 max-w-[500px]">
                                Whether you have an inquiry about our Bubu silhouette reimagined or require personal boutique services, our team is at your disposal.
                            </p>

                            <div className="space-y-10">
                                <div className="flex gap-6">
                                    <div className="flex-shrink-0 w-12 h-12 bg-black flex items-center justify-center text-white">
                                        <MapPin size={20} strokeWidth={1.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-widest mb-2">Our Atelier</h3>
                                        <p className="text-sm text-gray-500 leading-relaxed">
                                            Greenville Mall, Admiralty Way<br />
                                            Lekki Phase 1, Lagos, Nigeria
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-6">
                                    <div className="flex-shrink-0 w-12 h-12 bg-black flex items-center justify-center text-white">
                                        <Phone size={20} strokeWidth={1.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-widest mb-2">Concierge</h3>
                                        <p className="text-sm text-gray-500 leading-relaxed">
                                            08161331923<br />
                                            Mon - Fri, 9am - 6pm WAT
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-6">
                                    <div className="flex-shrink-0 w-12 h-12 bg-black flex items-center justify-center text-white">
                                        <Mail size={20} strokeWidth={1.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-widest mb-2">Email</h3>
                                        <p className="text-sm text-gray-500 leading-relaxed">
                                            Wodibenuah@yahoo.com
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div>
                            <h2 className="font-heading text-2xl md:text-3xl font-bold uppercase tracking-wider mb-8 border-b border-black pb-4">
                                Make an Enquiry
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">FullName*</label>
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="w-full border-b border-black py-2 focus:outline-none focus:border-gray-400 transition-colors text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Email Address*</label>
                                        <input
                                            type="email"
                                            name="email"
                                            required
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="w-full border-b border-black py-2 focus:outline-none focus:border-gray-400 transition-colors text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Phone Number</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            className="w-full border-b border-black py-2 focus:outline-none focus:border-gray-400 transition-colors text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Subject</label>
                                        <input
                                            type="text"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleInputChange}
                                            className="w-full border-b border-black py-2 focus:outline-none focus:border-gray-400 transition-colors text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Your Message*</label>
                                    <textarea
                                        name="message"
                                        required
                                        rows={4}
                                        value={formData.message}
                                        onChange={handleInputChange}
                                        className="w-full border-b border-black py-2 focus:outline-none focus:border-gray-400 transition-colors text-sm resize-none"
                                    />
                                </div>

                                <motion.button
                                    type="submit"
                                    disabled={isLoading}
                                    whileHover={reduceMotion ? undefined : { y: -2 }}
                                    whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                                    className="w-full md:w-auto px-12 py-4 bg-black text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-gray-900 transition-colors flex items-center justify-center gap-3 disabled:bg-gray-400"
                                >
                                    {isLoading ? 'Sending...' : 'Send Message'}
                                    <Send size={14} />
                                </motion.button>
                            </form>
                        </div>
                    </div>
                </section>

                {/* Interactive Location Map Section */}
                <section className="border-t border-black/10 pt-16 pb-20 max-w-[1400px] mx-auto px-5 md:px-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                        <div>
                            <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-accent mb-2">
                                <MapPin size={12} className="text-accent" />
                                Interactive Location Map
                            </span>
                            <h2 className="font-heading text-2xl md:text-4xl font-bold uppercase tracking-wider text-black">
                                Visit Greenville Mall Atelier
                            </h2>
                        </div>
                        <p className="text-xs text-gray-500 max-w-md font-sans">
                            Located in the heart of Lekki Phase 1. Private styling consultations and gown fitting appointments available upon request.
                        </p>
                    </div>

                    {/* Styled Map Container matching luxury UI theme */}
                    <div className="relative w-full h-[380px] md:h-[480px] rounded-2xl overflow-hidden border border-black/10 shadow-2xl group bg-background-light">
                        <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3964.7176767228807!2d3.4723508744800693!3d6.448094924036061!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103bf448f3a5efd5%3A0x3c6c604878a1a8be!2sGreenville%20Mall!5e0!3m2!1sen!2sng!4v1785841886293!5m2!1sen!2sng"
                            className="w-full h-full border-0 filter contrast-[1.05] grayscale-[0.15]"
                            allowFullScreen=""
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="Bubu Lagos Greenville Mall Location"
                        />

                        {/* Floating Theme-Matched Location Card Badge */}
                        <div className="absolute left-4 bottom-4 z-10 bg-black/90 backdrop-blur-md text-white p-4 rounded-xl border border-white/20 shadow-2xl max-w-[280px]">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                                <h4 className="text-[11px] font-heading font-bold uppercase tracking-[0.2em] text-white">
                                    Greenville Mall
                                </h4>
                            </div>
                            <p className="text-[10px] text-white/70 font-sans leading-relaxed">
                                Admiralty Way, Lekki Phase 1<br />
                                Lagos, Nigeria
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </Layout>
    );
}
