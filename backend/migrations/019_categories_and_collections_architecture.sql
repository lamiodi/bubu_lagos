-- Migration 019: Categories + Collections Architecture
-- Establishes strict separation: Categories (what a product IS) and Collections (merchandising groups)

-- 1. Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Collections Table
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  banner_url TEXT,
  accent_color VARCHAR(50) DEFAULT '#0F3D2E',
  display_order INT DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  seo_title VARCHAR(255),
  seo_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Update Products Table to Reference Category Foreign Key
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- 4. Create Product-Collections Many-to-Many Junction Table
CREATE TABLE IF NOT EXISTS product_collections (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, collection_id)
);

-- Indexes for ultra-fast query performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_collections_product_id ON product_collections(product_id);
CREATE INDEX IF NOT EXISTS idx_product_collections_collection_id ON product_collections(collection_id);
CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- 5. Seed Core Categories (What products ARE)
INSERT INTO categories (name, slug, description) VALUES
  ('Bubus', 'bubus', 'Classic and statement Bubu dresses, flowing caftans, and draped silhouettes.'),
  ('Turbans', 'turbans', 'Handcrafted royal silk velvet crown turbans, gelè headwraps, and bespoke headwear.'),
  ('Accessories', 'accessories', 'Artisan leather totes, brass waist cinchers, embroidered belts, and boutique jewelry.')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description;

-- 6. Seed Core Collections (Merchandising & Storytelling)
INSERT INTO collections (name, slug, description, display_order) VALUES
  ('New Arrivals', 'new-arrivals', 'Fresh seasonal releases handcrafted in our Lagos atelier.', 1),
  ('Signature Collection', 'signature-collection', 'Iconic, effortless luxury pieces defining the Bubu Lagos brand.', 2),
  ('Occasion Wear', 'occasion-wear', 'Gala and ceremonial grandeur designed for high-society events.', 3),
  ('Hand-Beaded Collection', 'hand-beaded-collection', 'Bespoke crystal and glass embellishment crafted over 40+ hours.', 4),
  ('Best Sellers', 'best-sellers', 'Our most sought-after silhouettes loved by clients worldwide.', 5)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order;
