-- Phase 3b: public order tracking code (GJ-XXXXXXXXXX). Idempotent.
-- Backfill uses md5(random()) — no pgcrypto extension needed. New orders get
-- their code from crypto.randomBytes in createOrder().

ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code TEXT;

UPDATE orders
  SET tracking_code = 'GJ-' || upper(substr(md5(random()::text || id::text), 1, 10))
  WHERE tracking_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_tracking ON orders(tracking_code);
