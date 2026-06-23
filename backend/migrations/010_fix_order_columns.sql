-- Make old guest columns nullable as we use customer_name/email/phone now
ALTER TABLE orders ALTER COLUMN guest_name DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN guest_email DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN guest_phone DROP NOT NULL;

-- Ensure categories id is correctly handled (some migrations might have used different types)
-- The initial schema used VARCHAR(255) with gen_random_uuid(), which is fine.
