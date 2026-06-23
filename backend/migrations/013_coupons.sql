-- Create enum for coupon discount type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coupon_type') THEN
        CREATE TYPE coupon_type AS ENUM ('Percentage', 'Fixed', 'BOGO');
    END IF;
END$$;

-- Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  type coupon_type NOT NULL,
  value DECIMAL(12, 2) NOT NULL, -- percentage or fixed amount
  min_order_amount DECIMAL(12, 2) DEFAULT 0,
  max_discount_amount DECIMAL(12, 2), -- for percentage discounts
  expiry_date TIMESTAMP,
  usage_limit INTEGER, -- total times this coupon can be used
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Update orders table to include coupon info
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id VARCHAR(255) REFERENCES coupons(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(12, 2) DEFAULT 0;

-- Index for coupon code lookup
CREATE INDEX IF NOT EXISTS idx_coupon_code ON coupons(code);
