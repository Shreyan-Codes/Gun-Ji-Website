-- Phase 5a (manual): payment method + status on orders. eSewa/Khalti merchant
-- APIs come later; for now cod | esewa (pay by QR, owner verifies screenshot).
-- Idempotent.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cod';
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_method_chk') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_payment_method_chk
      CHECK (payment_method IN ('cod', 'esewa', 'khalti'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_status_chk') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_payment_status_chk
      CHECK (payment_status IN ('unpaid', 'paid', 'refunded'));
  END IF;
END $$;
