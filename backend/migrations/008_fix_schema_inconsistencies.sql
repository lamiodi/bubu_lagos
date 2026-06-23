-- Create a migration to fix schema inconsistencies and add missing features

-- 1. Fix admin_users table
-- Add missing columns to admin_users
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS username VARCHAR(255);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 2. Fix orders table
-- Change shipping_address to jsonb for better object handling
ALTER TABLE orders ALTER COLUMN shipping_address TYPE JSONB USING shipping_address::JSONB;
-- Add customer_name, customer_email, customer_phone if missing (initial schema used guest_ versions)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reference VARCHAR(255) UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 3. Fix order_items table
-- Rename columns to match controller or add new ones
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_variant_id VARCHAR(255) REFERENCES product_variants(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS total_price DECIMAL(10, 2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 4. Fix contact_messages table
-- Add phone and subject if missing
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS subject VARCHAR(255);
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
