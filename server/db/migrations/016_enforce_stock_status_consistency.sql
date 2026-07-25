-- Keep saleable inventory internally consistent. A pre-order or deliberately
-- paused out-of-stock variant may retain quantity, but an in-stock variant must
-- always have at least one unit available.

UPDATE product_variants
   SET stock_status = 'out_of_stock'
 WHERE stock_status = 'in_stock' AND stock <= 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'product_variants_in_stock_has_inventory_chk'
  ) THEN
    ALTER TABLE product_variants
      ADD CONSTRAINT product_variants_in_stock_has_inventory_chk
      CHECK (stock_status <> 'in_stock' OR stock > 0);
  END IF;
END $$;
