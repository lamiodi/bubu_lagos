-- Migration 018: Seed Official Source of Truth Product Categories
-- Ensures all authorized categories exist in the database with rich luxury descriptions.

INSERT INTO categories (name, description) VALUES
  ('New Arrivals', 'The latest contemporary African luxury Bubu silhouettes, freshly arrived from our Lagos atelier.'),
  ('Signature Bubus', 'Our iconic, timeless Bubu designs crafted with fluid drape, refined silk, and effortless silhouette.'),
  ('Occasion Bubus', 'Statement Bubu gowns designed for celebrations, red carpets, galas, and ceremonial elegance.'),
  ('Bubu', 'Classic and elegant Bubu dresses with fluid drape and timeless silhouettes.'),
  ('Denim', 'Tailored luxury denim silhouettes accented with hand-dyed Adire denim lapels and brass hardware.'),
  ('Turban', 'Handcrafted silk velvet crown turbans, gelè headwraps, and bespoke headwear.'),
  ('Hand-Beaded Pieces', 'Bespoke garments individually embellished with hand-stitched beads, crystals, and artisanal detail.'),
  ('Adire & Heritage Textiles', 'Hand-dyed Yoruba indigo textiles, authentic Aso-Oke weaves, and heritage African prints cut for modern grace.'),
  ('Evening', 'Sophisticated evening Bubu gowns and floor-length velvet and silk designs tailored for dusk-to-dawn presence.'),
  ('Resort & Lounge', 'Lightweight linen, silk caftans, and fluid matching lounge sets crafted for tropical ease and luxury leisure.'),
  ('Accessories', 'Handcrafted brass jewelry, artisanal headwraps, embroidered belts, and statement accessories.'),
  ('Gift Cards', 'The ultimate gift of choice — instant digital delivery redeemable across all Bubu Lagos collections.')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description;
