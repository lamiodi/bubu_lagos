-- Seed product categories
INSERT INTO categories (name, description) VALUES
  ('Dresses', 'Elegant dresses for every occasion'),
  ('Tops', 'Stylish tops and blouses'),
  ('Knitwear', 'Cozy knitwear and sweaters'),
  ('Skirts', 'Beautiful skirts in various styles'),
  ('Trousers', 'Comfortable and stylish trousers'),
  ('Jackets', 'Trendy jackets and outerwear'),
  ('Denim', 'Classic denim pieces'),
  ('Coats', 'Warm coats for colder days'),
  ('Swimwear', 'Beach and swimwear collection'),
  ('Accessories', 'Fashion accessories and extras')
ON CONFLICT (name) DO NOTHING;
