-- Create store_settings table for site configuration
CREATE TABLE IF NOT EXISTS store_settings (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default settings
INSERT INTO store_settings (setting_key, setting_value) VALUES
  ('store_name', 'Bubu Lagos'),
  ('store_email', 'hello@bubulagos.com'),
  ('store_phone', '+234 123 456 7890'),
  ('store_address', 'Lagos, Nigeria'),
  ('currency', 'NGN'),
  ('shipping_fee', '0')
ON CONFLICT (setting_key) DO NOTHING;
