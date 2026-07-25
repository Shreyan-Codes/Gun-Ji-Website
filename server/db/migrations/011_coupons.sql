-- Coupons and immutable discount snapshots on orders. Idempotent.

CREATE TABLE IF NOT EXISTS coupons (
  id               SERIAL PRIMARY KEY,
  code             TEXT NOT NULL UNIQUE,
  description      TEXT NOT NULL DEFAULT '',
  discount_type    TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value   INTEGER NOT NULL CHECK (discount_value > 0),
  min_order_amount INTEGER NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
  max_uses         INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  uses_count       INTEGER NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  valid_from       TIMESTAMPTZ,
  valid_until      TIMESTAMPTZ,
  active           INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (discount_type <> 'percent' OR discount_value <= 100),
  CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from)
);

CREATE INDEX IF NOT EXISTS idx_coupons_active_code ON coupons(active, code);
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id INTEGER REFERENCES coupons(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;

UPDATE orders SET subtotal = total WHERE subtotal = 0 AND total > 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_subtotal_nonnegative_chk') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_subtotal_nonnegative_chk CHECK (subtotal >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_discount_valid_chk') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_discount_valid_chk CHECK (discount >= 0 AND discount <= subtotal);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_coupon ON orders(coupon_id);
