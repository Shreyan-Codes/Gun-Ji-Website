-- Keep a fresh database and the live launch catalog on the same prices as the
-- storefront fallback: Rs. 699 normal-fit tees, Rs. 1,099 custom print.

UPDATE products
   SET price = 699,
       compare_at_price = 999,
       updated_at = CURRENT_TIMESTAMP
 WHERE slug IN (
   'origin-tee',
   'origin-tee-black',
   'gunji-logo-tee-white',
   'gunji-logo-tee-black'
 );

UPDATE products
   SET price = 1099,
       price_from = 1,
       compare_at_price = 1299,
       updated_at = CURRENT_TIMESTAMP
 WHERE slug = 'your-print-here';
