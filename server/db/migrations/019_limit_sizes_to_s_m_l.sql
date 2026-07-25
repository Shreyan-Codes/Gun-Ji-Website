BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- No existing orders or wishlists reference these rows. Order history also
-- snapshots the selected size, so removing unavailable variants is safe.
DELETE FROM product_variants
WHERE size NOT IN ('S', 'M', 'L');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'product_variants'::regclass
      AND conname = 'product_variants_size_check'
  ) THEN
    ALTER TABLE product_variants
      ADD CONSTRAINT product_variants_size_check
      CHECK (size IN ('S', 'M', 'L'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'custom_requests'::regclass
      AND conname = 'custom_requests_size_check'
  ) THEN
    ALTER TABLE custom_requests
      ADD CONSTRAINT custom_requests_size_check
      CHECK (size IN ('', 'S', 'M', 'L')) NOT VALID;
  END IF;
END
$$;

COMMIT;
