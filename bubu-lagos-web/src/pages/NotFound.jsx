import { Layout } from '../components/Layout';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

export function NotFound() {
  const reduceMotion = useReducedMotion();
  return (
    <Layout headerVariant="solid">
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        {/* [MOTION ADDED] 404 entry */}
        <motion.h1
          className="text-6xl md:text-9xl font-heading font-black text-gray-200 mb-4"
          initial={reduceMotion ? false : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          404
        </motion.h1>
        <motion.h2
          className="text-2xl font-bold uppercase tracking-widest mb-8"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          A Piece of the Atelier is Missing
        </motion.h2>
        <motion.p
          className="text-gray-500 mb-8 max-w-md"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          The page you were looking for has slipped out of the wardrobe. Let us guide you back to the collection.
        </motion.p>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            to="/"
            className="px-8 py-4 bg-black text-white text-sm font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors inline-block"
          >
            Return to the Collection
          </Link>
        </motion.div>
      </div>
    </Layout>
  );
}
