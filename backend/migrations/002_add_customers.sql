-- Create customers table for customer accounts
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  phone VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create customer_addresses table for saved addresses
CREATE TABLE IF NOT EXISTS customer_addresses (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR(255) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(255) NOT NULL,
  state VARCHAR(255) NOT NULL,
  zip_code VARCHAR(50),
  phone VARCHAR(255),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Update orders table to support both guest and registered customers
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id VARCHAR(255) REFERENCES customers(id) ON DELETE SET NULL;

-- Create indexes for customer tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_customer_id') THEN
        CREATE INDEX idx_orders_customer_id ON orders(customer_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_addresses_customer_id') THEN
        CREATE INDEX idx_customer_addresses_customer_id ON customer_addresses(customer_id);
    END IF;
END$$;
