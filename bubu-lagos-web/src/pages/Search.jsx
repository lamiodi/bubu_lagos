import { Layout } from '../components/Layout';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { logger } from '../lib/logger';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { ProductCard } from '../components/ProductCard';


export function Search() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query) {
        fetchResults();
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get(`/products?search=${encodeURIComponent(query)}`);
      const list = data.products || [];
      setResults(list);
    } catch (err) {
      logger.error('Search error:', err);
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout headerVariant="solid">
      <div className="flex flex-col items-center min-h-[60vh] px-4 pt-20">
        <motion.h1
          className="text-4xl md:text-6xl font-heading font-black uppercase tracking-widest mb-8"
          initial={reduceMotion ? false : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          Search
        </motion.h1>
        <motion.div
          className="w-full max-w-[600px] border-b border-black mb-16"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <input
            type="text"
            placeholder="Type to search..."
            className="w-full py-4 text-xl md:text-2xl font-bold uppercase tracking-wider placeholder:text-gray-300 focus:outline-none bg-transparent"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </motion.div>

        {loading && <p className="text-[11px] uppercase tracking-widest mb-8">Searching archive...</p>}

        {/* Results Grid */}
        <div className="w-full max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-4 pb-20">
          <AnimatePresence>
            {results.map((product, i) => (
              <motion.div
                key={product.id}
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <ProductCard product={product} delay={0} inView={false} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {query && results.length === 0 && !loading && (
          <div className="text-center">
            <p className="text-gray-500 text-[11px] uppercase tracking-widest mb-2">No pieces match &quot;{query}&quot;</p>
            <p className="text-sm text-gray-400 max-w-md mx-auto">Try another search term, or explore the full collection.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
