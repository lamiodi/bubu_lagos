-- ===========================================================================
-- 017_admin_lockout_and_drop_order_customer.sql
--
-- Two unrelated changes bundled in one file:
--
--   1. Admin login lockout (Fix #6)
--      Adds failed_login_count + locked_until to admin_users. The
--      adminLogin controller increments the counter on a wrong password,
--      locks the account for 15 minutes after 5 consecutive failures,
--      and resets the counter to 0 on a successful login.
--
--   2. Drop orders.customer_id (Fix #10)
--      Guest-checkout is now the only mode, so the FK from orders to
--      customers is dead weight (and a footgun: it can re-attach an
--      order to a contact that just happens to share the email).
--      We drop the column and its index. The denormalised
--      customer_name/email/phone on the order itself stays.
--
-- All statements are idempotent (IF NOT EXISTS / IF EXISTS / DROP IF
-- EXISTS) so the migration is safe to re-run.
-- ===========================================================================

-- 1a) Add lockout columns to admin_users.
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- 1b) Sanity-check any rows that pre-date the new columns.
--     (Nothing to migrate; the defaults handle it.)

-- 2a) Drop the FK + index on orders.customer_id, then the column.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
DROP INDEX IF EXISTS idx_orders_customer_id;

-- 2b) The column itself. CASCADE catches any stragglers (views, etc.).
ALTER TABLE orders DROP COLUMN IF EXISTS customer_id CASCADE;
