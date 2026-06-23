-- ===========================================================================
-- 016_drop_customer_auth.sql
--
-- Removes the customer-account layer. The store is now guest-checkout only:
--   * customers table becomes a contact list (no password, no login flag)
--   * customer_addresses (saved-address book) is gone
--   * password_reset_tokens is gone
--   * order tracking moves to a public endpoint that needs both the
--     order reference AND the email used at checkout
--
-- All statements are idempotent and use IF EXISTS / CASCADE so the
-- migration is safe to re-run.
-- ===========================================================================

-- 1) Drop the auth-related tables entirely.
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS customer_addresses   CASCADE;

-- 2) Strip auth-only columns from customers. We keep is_guest (it's now
--    effectively always true, but the column is harmless and might be
--    useful for future filtering).
ALTER TABLE customers DROP COLUMN IF EXISTS password_hash;
ALTER TABLE customers DROP COLUMN IF EXISTS is_active;

-- 3) Order table is already denormalised with customer_name/email/phone
--    (added in 001 / 002), so the order itself is self-contained.
--    Add a covering index on customer_email so /api/orders/track and
--    admin lookups stay fast as the table grows.
CREATE INDEX IF NOT EXISTS idx_orders_customer_email_lower
  ON orders (LOWER(customer_email));

-- 4) Helpful analytics index: list unique customer emails for the
--    admin "Customers" view (getAllCustomers).
CREATE INDEX IF NOT EXISTS idx_customers_email_lower
  ON customers (LOWER(email));
