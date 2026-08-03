// [SOURCE OF TRUTH] Categories + Collections Architecture for Bubu Lagos.
// Categories = What a product IS (Bubus, Turbans, Accessories).
// Collections = How products are PRESENTED (New Arrivals, Signature Bubu, Hand-Beaded Collection, Best Sellers).

// Core Categories (What products ARE)
export const SAMPLE_CATEGORIES = [
  { id: 'cat-bubus', name: 'Bubus', slug: 'bubus', description: 'Classic and statement Bubu dresses, flowing caftans, and draped silhouettes.' },
  { id: 'cat-turbans', name: 'Turbans & Gelès', slug: 'turbans-geles', description: 'Handcrafted royal silk velvet crown turbans, gelè headwraps, and bespoke headwear.' },
  { id: 'cat-accessories', name: 'Artisan Accessories', slug: 'artisan-accessories', description: 'Artisan leather totes, brass waist cinchers, embroidered belts, and boutique jewelry.' },
];

// Merchandising Collections (How products are PRESENTED)
export const SAMPLE_COLLECTIONS = [
  { id: 'col-new', name: 'New Arrivals', slug: 'new-arrivals', description: 'Fresh seasonal releases handcrafted in our Lagos atelier.', bannerUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1600&h=600&fit=crop', accentColor: '#0F3D2E', displayOrder: 1 },
  { id: 'col-signature', name: 'Signature Bubu', slug: 'signature-bubu', description: 'Iconic, effortless luxury pieces defining the Bubu Lagos brand.', bannerUrl: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=1600&h=600&fit=crop', accentColor: '#0A291E', displayOrder: 2 },
  { id: 'col-beaded', name: 'Hand-Beaded Collection', slug: 'hand-beaded-collection', description: 'Bespoke crystal and glass embellishment crafted over 40+ hours.', bannerUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1600&h=600&fit=crop', accentColor: '#8C6D3B', displayOrder: 3 },
  { id: 'col-bestsellers', name: 'Best Sellers', slug: 'best-sellers', description: 'Our most sought-after silhouettes loved by clients worldwide.', bannerUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&h=600&fit=crop', accentColor: '#0F3D2E', displayOrder: 4 },
];

export const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=800&h=1000&fit=crop';
