-- Add gift_card_amount to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gift_card_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gift_card_id VARCHAR(255) REFERENCES gift_cards(id) ON DELETE SET NULL;
