-- Phase 3a: per-variant stock status (in_stock | pre_order | out_of_stock).
-- NOTE: stock_qty from the spec is intentionally NOT added — the existing
-- product_variants.stock column already holds quantity. Idempotent so a
-- re-run (e.g. before schema_migrations records it) is harmless.

ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS stock_status TEXT NOT NULL DEFAULT 'in_stock';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_stock_status_chk'
  ) THEN
    ALTER TABLE product_variants
      ADD CONSTRAINT product_variants_stock_status_chk
      CHECK (stock_status IN ('in_stock', 'pre_order', 'out_of_stock'));
  END IF;
END $$;

-- Backfill: zero-stock variants read as out_of_stock (only where still default).
UPDATE product_variants
  SET stock_status = 'out_of_stock'
  WHERE stock = 0 AND stock_status = 'in_stock';
