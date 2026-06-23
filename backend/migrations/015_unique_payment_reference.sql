-- Migration: enforce uniqueness on orders.payment_reference
--
-- Why: the Paystack webhook handler performs an application-level
-- idempotency check on payment_reference, but a UNIQUE constraint
-- is the only race-proof way to guarantee that no two orders can
-- ever share a reference - even if two webhooks for the same charge
-- arrive at the exact same instant and both pass the pre-check.
--
-- Step 1: For any orders that ALREADY have a duplicate
-- payment_reference (possible if duplicates were processed before
-- this fix), keep only the earliest created_at row's reference and
-- NULL the rest. This is safe because the app already treats a NULL
-- payment_reference as "not yet verified" and re-verification is
-- safe (the verifyPayment route handler also has its own guard).
UPDATE orders
SET payment_reference = NULL
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY payment_reference
             ORDER BY created_at ASC, id ASC
           ) AS rn
    FROM orders
    WHERE payment_reference IS NOT NULL
  ) t
  WHERE t.rn > 1
);

-- Step 2: Add the UNIQUE constraint. The application-level check
-- will now back-stop any concurrent inserts; this constraint is the
-- last line of defence and will throw if the app check ever fails.
ALTER TABLE orders
  ADD CONSTRAINT orders_payment_reference_unique UNIQUE (payment_reference);
