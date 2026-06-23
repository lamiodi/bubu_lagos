-- Create enum for gift card status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gift_card_status') THEN
        CREATE TYPE gift_card_status AS ENUM ('Active', 'Fully_Redeemed', 'Expired', 'Cancelled');
    END IF;
END$$;

-- Create gift cards table
CREATE TABLE IF NOT EXISTS gift_cards (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT UNIQUE NOT NULL,
  code_masked VARCHAR(20) NOT NULL,
  original_balance DECIMAL(12, 2) NOT NULL,
  current_balance DECIMAL(12, 2) NOT NULL,
  expiry_date TIMESTAMP NOT NULL,
  status gift_card_status DEFAULT 'Active',
  customer_id VARCHAR(255) REFERENCES customers(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create gift card logs for audit trail
CREATE TABLE IF NOT EXISTS gift_card_logs (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id VARCHAR(255) NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
  order_id VARCHAR(255) REFERENCES orders(id) ON DELETE SET NULL,
  amount_used DECIMAL(12, 2) NOT NULL,
  balance_before DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL, -- 'Creation', 'Redemption', 'Refund', 'Cancellation'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for fast lookup by hash
CREATE INDEX IF NOT EXISTS idx_gift_card_hash ON gift_cards(code_hash);

-- Create index for customer gift cards
CREATE INDEX IF NOT EXISTS idx_gift_card_customer ON gift_cards(customer_id);
