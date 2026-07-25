-- Adds the GUN-जी signature logo tee (white + black) from the studio shoot.
-- Purely additive: the existing print editions (player / anime / देसी /
-- essentials / custom) are left exactly as they are.
--
-- Idempotent — every INSERT is guarded, so a re-run changes nothing.
-- sort_order 1/2 puts the signature tees at the front of the rack (the print
-- editions sit at 10+), so they lead without renumbering anything.

-- ---------- signature logo tee — white ----------
INSERT INTO products
  (name, slug, description, tag, price, price_from, compare_at_price, edition, order_item, sort_order, active)
VALUES
  ('GUN-जी Logo Tee — White', 'gunji-logo-tee-white',
   'The signature GUN-जी mark on a heavyweight oversized tee. Printed in Kathmandu, boxy drop-shoulder fit, ribbed crew neck.',
   'Signature — white, oversized', 1099, 0, 1299, 'signature',
   'GUN-जी Logo Tee (white, oversized)', 1, 1)
ON CONFLICT (slug) DO NOTHING;

-- ---------- signature logo tee — black ----------
INSERT INTO products
  (name, slug, description, tag, price, price_from, compare_at_price, edition, order_item, sort_order, active)
VALUES
  ('GUN-जी Logo Tee — Black', 'gunji-logo-tee-black',
   'The signature GUN-जी mark on a heavyweight oversized tee. Printed in Kathmandu, boxy drop-shoulder fit, ribbed crew neck.',
   'Signature — black, oversized', 1099, 0, 1299, 'signature',
   'GUN-जी Logo Tee (black, oversized)', 2, 1)
ON CONFLICT (slug) DO NOTHING;

-- ---------- images (only when the product has none yet) ----------
INSERT INTO product_images (product_id, url, alt, sort_order)
SELECT p.id, i.url, i.alt, i.sort_order
  FROM products p
  JOIN (VALUES
      ('gunji-logo-tee-white', '/assets/gunji_tee_white_front.jpg', 'GUN-जी logo oversized t-shirt in white, laid flat', 0),
      ('gunji-logo-tee-white', '/assets/gunji_duo_stack.jpg',       'White and black GUN-जी logo tees layered over each other', 1),
      ('gunji-logo-tee-white', '/assets/gunji_duo_detail.jpg',      'Close-up of the GUN-जी chest print', 2),
      ('gunji-logo-tee-black', '/assets/gunji_tee_black_front.jpg', 'GUN-जी logo oversized t-shirt in black, laid flat', 0),
      ('gunji-logo-tee-black', '/assets/gunji_duo_street.jpg',      'GUN-जी logo tees laid out on turf, shot from above', 1),
      ('gunji-logo-tee-black', '/assets/gunji_duo_detail.jpg',      'Close-up of the GUN-जी chest print', 2)
    ) AS i(slug, url, alt, sort_order) ON i.slug = p.slug
 WHERE NOT EXISTS (SELECT 1 FROM product_images x WHERE x.product_id = p.id);

-- ---------- variants: S–XXL per colourway ----------
INSERT INTO product_variants (product_id, size, color, stock, sku, stock_status)
SELECT p.id, s.size, c.color, 12,
       'GJ-LOGO-' || c.code || '-' || s.size, 'in_stock'
  FROM products p
  JOIN (VALUES
      ('gunji-logo-tee-white', 'White', 'W'),
      ('gunji-logo-tee-black', 'Black', 'B')
    ) AS c(slug, color, code) ON c.slug = p.slug
 CROSS JOIN (VALUES ('S'), ('M'), ('L'), ('XL'), ('XXL')) AS s(size)
ON CONFLICT (product_id, size, color) DO NOTHING;
