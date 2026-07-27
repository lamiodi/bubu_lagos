-- Seed product categories
INSERT INTO categories (name, description) VALUES
  ('Denim', 'Classic denim pieces'),
  ('Turban', 'Beautiful headwraps and turbans'),
  ('Bubu', 'Classic and elegant Bubu dresses')
ON CONFLICT (name) DO NOTHING;
