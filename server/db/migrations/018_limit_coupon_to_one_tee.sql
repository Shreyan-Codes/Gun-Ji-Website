ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS max_discount_items INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'coupons'::regclass
      AND conname = 'coupons_max_discount_items_check'
  ) THEN
    ALTER TABLE coupons
      ADD CONSTRAINT coupons_max_discount_items_check
      CHECK (max_discount_items IS NULL OR max_discount_items > 0);
  END IF;
END
$$;

-- The current promotion is open to any number of customers for 48 hours, but
-- each order receives the discount on at most one T-shirt.
UPDATE coupons
SET max_uses = NULL,
    max_discount_items = 1,
    valid_from = CURRENT_TIMESTAMP,
    valid_until = CURRENT_TIMESTAMP + INTERVAL '2 days',
    active = 1,
    updated_at = CURRENT_TIMESTAMP
WHERE active = 1;
