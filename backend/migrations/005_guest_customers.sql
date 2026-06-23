-- Make password_hash nullable to support guest customers
ALTER TABLE customers ALTER COLUMN password_hash DROP NOT NULL;

-- Add is_guest flag to distinguish guest vs registered customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;

-- Add unique constraint on phone for guest matching (email already unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone_unique ON customers(phone) WHERE phone IS NOT NULL AND phone != '';

-- Add index for faster guest customer lookups
CREATE INDEX IF NOT EXISTS idx_customers_is_guest ON customers(is_guest);
