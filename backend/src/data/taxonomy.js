// [SOURCE OF TRUTH — SEED ONLY] Categories + Collections Architecture for Bubu Lagos.
// Categories = What a product IS (Bubus, Turbans, Accessories).
// Collections = How products are PRESENTED (New Arrivals, Signature Bubu, Hand-Beaded Collection, Best Sellers).
//
// This file is the canonical source for the initial taxonomy that gets seeded
// into the database via `npm run seed`. Once the data is in the database, the
// frontend MUST source categories and collections from the API only — no
// frontend code should hardcode or import these constants.

// Core Categories (What products ARE)
export const SEED_CATEGORIES = [
  { name: 'Bubus', slug: 'bubus', description: 'Classic and statement Bubu dresses, flowing caftans, and draped silhouettes.' },
  { name: 'Turbans & Gelès', slug: 'turbans-geles', description: 'Handcrafted royal silk velvet crown turbans, gelè headwraps, and bespoke headwear.' },
  { name: 'Artisan Accessories', slug: 'artisan-accessories', description: 'Artisan leather totes, brass waist cinchers, embroidered belts, and boutique jewelry.' },
];

// Merchandising Collections (How products are PRESENTED)
export const SEED_COLLECTIONS = [
  { name: 'New Arrivals', slug: 'new-arrivals', description: 'Fresh seasonal releases handcrafted in our Lagos atelier.', displayOrder: 1 },
  { name: 'Signature Bubu', slug: 'signature-bubu', description: 'Iconic, effortless luxury pieces defining the Bubu Lagos brand.', displayOrder: 2 },
  { name: 'Hand-Beaded Collection', slug: 'hand-beaded-collection', description: 'Bespoke crystal and glass embellishment crafted over 40+ hours.', displayOrder: 3 },
  { name: 'Best Sellers', slug: 'best-sellers', description: 'Our most sought-after silhouettes loved by clients worldwide.', displayOrder: 4 },
];
