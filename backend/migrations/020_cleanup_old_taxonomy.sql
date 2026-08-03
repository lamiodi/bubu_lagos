-- Migration 020: Cleanup old taxonomy
-- Removes any categories and collections that do not belong to the approved luxury taxonomy.

-- Delete all collections that are NOT approved
DELETE FROM collections 
WHERE name NOT IN (
  'New Arrivals',
  'Signature Bubu',
  'Hand-Beaded Collection',
  'Best Sellers'
);

-- Delete all categories that are NOT approved
-- Note: we need to handle products that might be referencing old categories.
-- For a safe migration, we set their category_id to NULL before deleting the category
UPDATE products
SET category_id = NULL
WHERE category_id IN (
  SELECT id FROM categories 
  WHERE name NOT IN (
    'Bubus',
    'Turbans & Gelès',
    'Artisan Accessories'
  )
);

-- Delete all old categories
DELETE FROM categories 
WHERE name NOT IN (
  'Bubus',
  'Turbans & Gelès',
  'Artisan Accessories'
);
