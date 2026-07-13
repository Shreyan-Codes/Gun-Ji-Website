-- Compare-at ("was") price for showing a struck-through original + discount.
-- NULL = no sale badge. Whole rupees, like price.
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price INTEGER;
