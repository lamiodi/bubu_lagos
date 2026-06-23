// [MOTION ADDED] Generic product seed used when the backend is unreachable
// (or for development). All images are Unsplash CDN links that render reliably
// even offline, so every page (Home, Shop, ProductDetail, Search) is fully
// populated with placeholder inventory that the user can later replace via
// the admin panel.
// Note: we use the simple ?w=..&h=..&fit=crop format (no auto=format) which
// avoids ORB (Opaque Response Blocking) issues in some browsers/dev servers.
const IMG = (id, w = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${(w * 4) / 3}&fit=crop&q=80`;

// Curated, known-stable Unsplash photo IDs (editorial / fashion-leaning)
const P = {
  dressA: '1539008835657-9e8e9680c956',
  dressB: '1572804013427-4d7ca7268217',
  dressC: '1551803091-e20673f15770',
  knitA: '1576566588028-4147f3842f27',
  knitB: '1556905055-8f358a7a47b2',
  outerA: '1551488831-00ddcb6c6bd3',
  outerB: '1544022613-e87ca75a784a',
  topA: '1564257631407-4deb1f99d992',
  topB: '1554568218-0f1715e72254',
  bottomA: '1542272604-787c3835535d',
  bottomB: '1593030103066-0093718efeb9',
  bagA: '1590874103328-eac38a683ce7',
  bagB: '1584917865442-de89df76afd3',
  shoesA: '1543163521-1bf539c55dd2',
  shoesB: '1560343090-f0409e92791a',
  accA: '1599643477877-530eb83abc8e',
  accB: '1611923134239-b9be5816e23d',
  edit1: '1483985988355-763728e1935b',
  edit2: '1490481651871-ab68de25d43d',
  edit3: '1529139574466-a303027c1d8b',
  heroA: '1515886657613-9f3515b0c78f',
  heroB: '1469334031218-e382a71b716b',
  heroC: '1539109136881-3be0616acf4b',
};

export const SAMPLE_CATEGORIES = [
  { id: 'cat-new', name: 'New Arrivals' },
  { id: 'cat-signature', name: 'Signature Bubus' },
  { id: 'cat-occasion', name: 'Occasion Bubus' },
  { id: 'cat-beaded', name: 'Hand-Beaded Pieces' },
  { id: 'cat-adire', name: 'Adire & Heritage Textiles' },
  { id: 'cat-evening', name: 'Evening' },
  { id: 'cat-resort', name: 'Resort & Lounge' },
  { id: 'cat-accessories', name: 'Accessories' },
  { id: 'cat-giftcard', name: 'Gift Cards' },
];

const c = (name, id) => ({ name, id, slug: name.toLowerCase() });
const v = (id, name, price, stock = 12) => ({ id, name, price, stockQuantity: stock });

const make = (id, name, basePrice, category, imageIds, variants) => ({
  id,
  name,
  basePrice,
  category,
  images: imageIds.map((pid) => IMG(pid, 900)),
  variants,
  description: 'A study in restraint and craft — placeholder copy you can replace from the admin panel.',
  collection: 'Atelier 2026',
});

export const SAMPLE_PRODUCTS = [
  make('p-001', 'Saharan Linen Bubu', 285000, c('Signature Bubus', 'cat-signature'),
    [P.dressA, P.edit1, P.heroA],
    [v('p-001-s', 'S', 285000), v('p-001-m', 'M', 285000), v('p-001-l', 'L', 285000), v('p-001-xl', 'XL', 285000)]),
  make('p-002', 'Indigo Tunic Bubu', 320000, c('Occasion Bubus', 'cat-occasion'),
    [P.dressB, P.dressC],
    [v('p-002-s', 'S', 320000), v('p-002-m', 'M', 320000), v('p-002-l', 'L', 320000)]),
  make('p-003', 'Aso-Oke Heritage Bubu', 410000, c('Adire & Heritage Textiles', 'cat-adire'),
    [P.dressC, P.heroB],
    [v('p-003-xs', 'XS', 410000), v('p-003-s', 'S', 410000), v('p-003-m', 'M', 410000)]),
  make('p-004', 'Adire Cotton Blouse', 165000, c('Adire & Heritage Textiles', 'cat-adire'),
    [P.topA, P.topB],
    [v('p-004-s', 'S', 165000), v('p-004-m', 'M', 165000), v('p-004-l', 'L', 165000)]),
  make('p-005', 'Lagos Silk Camisole', 195000, c('Evening', 'cat-evening'),
    [P.topB, P.edit3],
    [v('p-005-xs', 'XS', 195000), v('p-005-s', 'S', 195000), v('p-005-m', 'M', 195000), v('p-005-l', 'L', 195000)]),
  make('p-006', 'Heritage Beaded Bubu', 245000, c('Hand-Beaded Pieces', 'cat-beaded'),
    [P.knitA, P.knitB],
    [v('p-006-m', 'M', 245000), v('p-006-l', 'L', 245000)]),
  make('p-007', 'Signature Occasion Bubu', 215000, c('Occasion Bubus', 'cat-occasion'),
    [P.knitB, P.knitA],
    [v('p-007-s', 'S', 215000), v('p-007-m', 'M', 215000), v('p-007-l', 'L', 215000)]),
  make('p-008', 'Atelier Wool Wrap', 580000, c('Signature Bubus', 'cat-signature'),
    [P.outerA, P.outerB],
    [v('p-008-m', 'M', 580000), v('p-008-l', 'L', 580000), v('p-008-xl', 'XL', 580000)]),
  make('p-009', 'Linen Resort Bubu', 510000, c('Resort & Lounge', 'cat-resort'),
    [P.outerB, P.outerA],
    [v('p-009-s', 'S', 510000), v('p-009-m', 'M', 510000), v('p-009-l', 'L', 510000)]),
  make('p-010', 'High-Waisted Tailored Trouser', 295000, c('Signature Bubus', 'cat-signature'),
    [P.bottomA, P.bottomB],
    [v('p-010-26', '26', 295000), v('p-010-28', '28', 295000), v('p-010-30', '30', 295000), v('p-010-32', '32', 295000)]),
  make('p-011', 'Edo Leather Atelier Tote', 425000, c('Accessories', 'cat-accessories'),
    [P.bagA, P.bagB],
    [v('p-011-os', 'One Size', 425000, 6)]),
  make('p-012', 'Hand-Stitched Evening Loafer', 365000, c('Evening', 'cat-evening'),
    [P.shoesA, P.shoesB],
    [v('p-012-37', '37', 365000), v('p-012-38', '38', 365000), v('p-012-39', '39', 365000), v('p-012-40', '40', 365000), v('p-012-41', '41', 365000)]),
  // [NEW] Gift card — appears in Shop like a product, links to /gift-card.
  // Variants are the 5 preset amounts the gift card page exposes.
  {
    id: 'p-giftcard',
    name: 'Bubu Lagos Gift Card',
    basePrice: 100000,
    category: c('Gift Cards', 'cat-giftcard'),
    images: [
      // Editorial gift-box / ribbon image — known-stable Unsplash id
      'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=900&h=1200&fit=crop&q=80',
    ],
    variants: [
      v('p-giftcard-100k', '₦100,000', 100000, 9999),
      v('p-giftcard-200k', '₦200,000', 200000, 9999),
      v('p-giftcard-500k', '₦500,000', 500000, 9999),
      v('p-giftcard-700k', '₦700,000', 700000, 9999),
      v('p-giftcard-1m', '₦1,000,000', 1000000, 9999),
    ],
    description:
      'Give the perfect gift. Send a Bubu Lagos Gift Card instantly via email — the ultimate gift of choice. Choose any amount from ₦100,000 to ₦1,000,000.',
    collection: 'Atelier 2026',
    // When the user clicks this product card, route to /gift-card instead of /product/:id
    linkOverride: '/gift-card',
    // Don't show price in the usual "starting at" form; the gift card page handles amounts.
    priceLabel: 'From ₦100,000',
    // Flag the card so the product tile can show a "Give the gift" tag
    isGiftCard: true,
  },
];

// Convenience: a curated set of 4 products for the hero
export const HERO_PRODUCT_IDS = ['p-001', 'p-006', 'p-008', 'p-010'];

export const getSampleProductById = (id) => SAMPLE_PRODUCTS.find((p) => p.id === id);
export const getSampleCategoryByName = (name) =>
  SAMPLE_CATEGORIES.find((c) => c.name.toLowerCase() === name.toLowerCase());

// Guaranteed-working fallback image (Unsplash) used by <img onError>
export const FALLBACK_IMAGE = IMG('1515886657613-9f3515b0c78f', 900);
