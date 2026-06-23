-- Seed initial coupons
INSERT INTO coupons (code, type, value, min_order_amount, usage_limit)
VALUES 
('WELCOME10', 'Percentage', 10, 5000, 100),
('BUBU5000', 'Fixed', 5000, 20000, 50),
('BLACKFRIDAY', 'Percentage', 25, 10000, 500)
ON CONFLICT (code) DO NOTHING;
