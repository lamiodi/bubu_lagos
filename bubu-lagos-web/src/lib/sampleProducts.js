// [SOURCE OF TRUTH] Categories + Collections Architecture for Bubu Lagos.
// Categories = What a product IS (Bubus, Turbans, Accessories).
// Collections = How products are PRESENTED (New Arrivals, Signature Bubu, Hand-Beaded Collection, Best Sellers).

const IMG = (id, w = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${(w * 4) / 3}&fit=crop&q=80`;

const P = {
  bubuA: '1539008835657-9e8e9680c956',
  bubuB: '1572804013427-4d7ca7268217',
  bubuC: '1551803091-e20673f15770',
  beadedA: '1576566588028-4147f3842f27',
  beadedB: '1556905055-8f358a7a47b2',
  capeA: '1551488831-00ddcb6c6bd3',
  capeB: '1544022613-e87ca75a784a',
  adireA: '1564257631407-4deb1f99d992',
  adireB: '1554568218-0f1715e72254',
  resortA: '1542272604-787c3835535d',
  resortB: '1593030103066-0093718efeb9',
  accA: '1590874103328-eac38a683ce7',
  accB: '1599643477877-530eb83abc8e',
  edit1: '1483985988355-763728e1935b',
  edit2: '1490481651871-ab68de25d43d',
  edit3: '1529139574466-a303027c1d8b',
  heroA: '1515886657613-9f3515b0c78f',
  heroB: '1469334031218-e382a71b716b',
  heroC: '1539109136881-3be0616acf4b',
};

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

const CAT = {
  bubus: SAMPLE_CATEGORIES[0],
  turbans: SAMPLE_CATEGORIES[1],
  accessories: SAMPLE_CATEGORIES[2],
};

const COL = {
  new: SAMPLE_COLLECTIONS[0],
  signature: SAMPLE_COLLECTIONS[1],
  beaded: SAMPLE_COLLECTIONS[2],
  bestsellers: SAMPLE_COLLECTIONS[3],
};

const v = (id, name, price, stock = 12) => ({ id, name, price, stockQuantity: stock });

const make = (id, name, basePrice, category, collections, imageIds, variants, description, sku) => ({
  id,
  name,
  sku: sku || `BL-${category.slug.toUpperCase()}-${id.toUpperCase()}`,
  basePrice,
  category, // Single category object
  collections, // Array of collection objects
  images: imageIds.map((pid) => IMG(pid, 900)),
  variants,
  description: description || 'Handcrafted in our Lagos atelier with fluid drape, rich texture, and statement African craftsmanship.',
  collection: collections[0]?.name || 'Signature Collection',
  details: {
    fabric: '100% Saharan Raw Silk & Linen',
    fit: 'Fluid Oversized Silhouette',
    care: 'Professional Dry Clean Only',
    origin: 'Handcrafted in Lagos, Nigeria',
  },
});

export const SAMPLE_PRODUCTS = [
  make(
    'p-001',
    'Saharan Linen Bubu',
    285000,
    CAT.bubus,
    [COL.new, COL.signature, COL.bestsellers],
    [P.bubuA, P.edit1, P.heroA],
    [v('p-001-s', 'S', 285000), v('p-001-m', 'M', 285000), v('p-001-l', 'L', 285000), v('p-001-xl', 'XL', 285000)],
    'Cut from raw Saharan linen with an exaggerated fluid silhouette and discreet side slits. Hand-finished in Lagos.'
  ),
  make(
    'p-002',
    'Royal Indigo Silk Bubu',
    320000,
    CAT.bubus,
    [COL.signature, COL.bestsellers],
    [P.bubuB, P.bubuC],
    [v('p-002-s', 'S', 320000), v('p-002-m', 'M', 320000), v('p-002-l', 'L', 320000)],
    'Woven from heavy silk crepe with deep indigo hue and metallic embroidery around the V-neckline.'
  ),
  make(
    'p-003',
    'Aso-Oke Heritage Bubu',
    410000,
    CAT.bubus,
    [COL.signature],
    [P.bubuC, P.heroB],
    [v('p-003-xs', 'XS', 410000), v('p-003-s', 'S', 410000), v('p-003-m', 'M', 410000)],
    'Featuring hand-woven Aso-Oke paneling along the sleeves and hemline, honoring traditional Yoruba weaving technique.'
  ),
  make(
    'p-004',
    'Adire Silk Kaftan Bubu',
    265000,
    CAT.bubus,
    [COL.new, COL.signature],
    [P.adireA, P.adireB],
    [v('p-004-s', 'S', 265000), v('p-004-m', 'M', 265000), v('p-004-l', 'L', 265000)],
    'Hand-dyed Adire silk caftan with modern abstract motif, cut for effortless movement and breezy elegance.'
  ),
  make(
    'p-005',
    'Lagos Velvet Evening Bubu',
    395000,
    CAT.bubus,
    [COL.signature],
    [P.bubuB, P.edit3],
    [v('p-005-xs', 'XS', 395000), v('p-005-s', 'S', 395000), v('p-005-m', 'M', 395000), v('p-005-l', 'L', 395000)],
    'Rich midnight velvet floor-length Bubu gown accented with gold thread embroidery for regal evening presence.'
  ),
  make(
    'p-006',
    'Royal Beaded Coral Bubu',
    485000,
    CAT.bubus,
    [COL.beaded, COL.bestsellers],
    [P.beadedA, P.beadedB],
    [v('p-006-s', 'S', 485000), v('p-006-m', 'M', 485000), v('p-006-l', 'L', 485000)],
    'Adorned with over 2,000 hand-stitched glass coral beads across the bodice. Over 40 hours of artisanal handwork.'
  ),
  make(
    'p-007',
    'Eko Gold Embroidered Bubu',
    345000,
    CAT.bubus,
    [COL.beaded],
    [P.beadedB, P.beadedA],
    [v('p-007-s', 'S', 345000), v('p-007-m', 'M', 345000), v('p-007-l', 'L', 345000)],
    'Pure silk organza Bubu gown embroidered with intricate Lagos floral filigree and hand-finished hems.'
  ),
  make(
    'p-008',
    'Atelier Cashmere Bubu Cape',
    580000,
    CAT.bubus,
    [COL.signature, COL.new],
    [P.capeA, P.capeB],
    [v('p-008-m', 'M', 580000), v('p-008-l', 'L', 580000), v('p-008-xl', 'XL', 580000)],
    'A plush cashmere-blend Bubu outerwear cape designed for regal layering during cooler evenings and travel.'
  ),
  make(
    'p-009',
    'Royal Silk Velvet Crown Turban',
    145000,
    CAT.turbans,
    [COL.new, COL.signature, COL.bestsellers],
    [P.accB, P.accA],
    [v('p-009-os', 'One Size', 145000, 15)],
    'Structured silk velvet crown turban accompanied by custom gold-plated coral hairpins.'
  ),
  make(
    'p-010',
    'Hand-Embroidered Gelè Turban',
    125000,
    CAT.turbans,
    [COL.signature],
    [P.accA, P.accB],
    [v('p-010-os', 'One Size', 125000, 20)],
    'Pre-pleated silk organza gelè turban with metallic gold thread embroidery.'
  ),
  make(
    'p-011',
    'Handcrafted Brass Waist Cincher',
    185000,
    CAT.accessories,
    [COL.signature, COL.bestsellers],
    [P.accA, P.accB],
    [v('p-011-os', 'One Size', 185000, 10)],
    'Hand-hammered brass waist cincher and matching wrist cuffs designed to structure flowing Bubu silhouettes.'
  ),
  make(
    'p-012',
    'Artisan Leather & Aso-Oke Tote Bag',
    215000,
    CAT.accessories,
    [COL.new, COL.signature],
    [P.accB, P.accA],
    [v('p-012-os', 'One Size', 215000, 8)],
    'Structured luxury tote featuring vegetable-tanned Italian leather and hand-woven Aso-Oke side panels.'
  ),
  make(
    'p-013',
    'Monarch Silk Chiffon Bubu',
    380000,
    CAT.bubus,
    [COL.new, COL.signature],
    [P.edit2, P.heroC],
    [v('p-013-s', 'S', 380000), v('p-013-m', 'M', 380000), v('p-013-l', 'L', 380000)],
    'Fresh from our Lagos atelier: a semi-sheer silk chiffon Bubu with dramatic balloon sleeves and high collar.'
  ),
  {
    id: 'p-giftcard',
    name: 'Bubu Lagos Luxury Gift Card',
    sku: 'BL-ACC-GIFTCARD',
    basePrice: 100000,
    category: CAT.accessories,
    collections: [COL.signature, COL.bestsellers],
    images: [
      'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=900&h=1200&fit=crop&q=80',
    ],
    variants: [
      v('p-giftcard-100k', '₦100,000', 100000, 9999),
      v('p-giftcard-200k', '₦200,000', 200000, 9999),
      v('p-giftcard-500k', '₦500,000', 500000, 9999),
      v('p-giftcard-700k', '₦700,000', 700000, 9999),
      v('p-giftcard-1m', '₦1,000,000', 1000000, 9999),
    ],
    description: 'Give the gift of bespoke luxury. Delivered digitally or in an embossed gold velvet box.',
    collection: 'Signature Collection',
    details: {
      fabric: 'Digital / Embossed Gold Gift Voucher',
      fit: 'Redeemable across all collections',
      care: 'No Expiration Date',
      origin: 'Bubu Lagos Atelier',
    },
  },
];

export const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=800&h=1000&fit=crop';
