-- Repositions the live catalog around normal-fit tees and Nepalwide delivery.
-- Existing products are updated in place so historic order references remain valid.

UPDATE products
   SET name = 'GUN-जी Normal Fit T-Shirt',
       description = 'A premium normal-fit cotton t-shirt in white at an affordable price, with delivery across Nepal.',
       tag = 'Normal fit — white',
       order_item = 'GUN-जी Normal Fit T-Shirt (white)',
       updated_at = CURRENT_TIMESTAMP
 WHERE slug = 'gunji-logo-tee-white';

UPDATE products
   SET name = 'GUN-जी Normal Fit T-Shirt — Black',
       description = 'A premium normal-fit cotton t-shirt in black at an affordable price, with delivery across Nepal.',
       tag = 'Normal fit — black',
       order_item = 'GUN-जी Normal Fit T-Shirt (black)',
       updated_at = CURRENT_TIMESTAMP
 WHERE slug = 'gunji-logo-tee-black';

UPDATE product_images
   SET alt = 'GUN-जी normal fit t-shirt in white, laid flat'
 WHERE product_id = (SELECT id FROM products WHERE slug = 'gunji-logo-tee-white')
   AND sort_order = 0;

UPDATE product_images
   SET alt = 'GUN-जी normal fit t-shirt in black, laid flat'
 WHERE product_id = (SELECT id FROM products WHERE slug = 'gunji-logo-tee-black')
   AND sort_order = 0;

UPDATE products
   SET active = 0, updated_at = CURRENT_TIMESTAMP
 WHERE edition = 'essentials'
   AND active = 1;

DELETE FROM product_variants
 WHERE product_id IN (
   SELECT id FROM products
    WHERE slug IN ('gunji-logo-tee-white', 'gunji-logo-tee-black')
 )
   AND size NOT IN ('XL', 'XXL', 'XXXL');

INSERT INTO product_variants (product_id, size, color, stock, sku)
SELECT p.id, sizes.size, colors.color, 12,
       'GJ-' || p.id || '-' || sizes.size || '-' || UPPER(LEFT(colors.color, 2))
  FROM products p
  CROSS JOIN (VALUES ('XL'), ('XXL'), ('XXXL')) AS sizes(size)
  CROSS JOIN LATERAL (
    SELECT CASE
      WHEN p.slug = 'gunji-logo-tee-white' THEN 'White'
      ELSE 'Black'
    END AS color
  ) AS colors
 WHERE p.slug IN ('gunji-logo-tee-white', 'gunji-logo-tee-black')
ON CONFLICT (product_id, size, color) DO NOTHING;
