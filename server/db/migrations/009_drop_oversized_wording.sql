-- Drops the word "oversized" from stored product copy (tags, order labels,
-- descriptions and image alt text). The SEO layer keeps the term — it lives in
-- the frontend's <title>/meta/H1, not in the database.
--
-- Replacement order matters: strip ", oversized" first so "(white, oversized)"
-- becomes "(white)" rather than "(white,)", then the trailing-space form so
-- "heavyweight oversized tee" becomes "heavyweight tee" without a double space.
--
-- Idempotent: rows with no match are left untouched, and a second run is a
-- no-op because the WHERE clause no longer matches anything.

UPDATE products
   SET tag         = REPLACE(REPLACE(REPLACE(tag,         ', oversized', ''), 'oversized ', ''), 'oversized', ''),
       order_item  = REPLACE(REPLACE(REPLACE(order_item,  ', oversized', ''), 'oversized ', ''), 'oversized', ''),
       description = REPLACE(REPLACE(REPLACE(description, ', oversized', ''), 'oversized ', ''), 'oversized', ''),
       updated_at  = CURRENT_TIMESTAMP
 WHERE tag ILIKE '%oversized%'
    OR order_item ILIKE '%oversized%'
    OR description ILIKE '%oversized%';

UPDATE product_images
   SET alt = REPLACE(REPLACE(REPLACE(alt, ', oversized', ''), 'oversized ', ''), 'oversized', '')
 WHERE alt ILIKE '%oversized%';

-- Tidy any double spaces or trailing separators the strip could leave behind.
UPDATE products
   SET tag        = BTRIM(REGEXP_REPLACE(tag,        '\s+', ' ', 'g')),
       order_item = BTRIM(REGEXP_REPLACE(order_item, '\s+', ' ', 'g')),
       updated_at = CURRENT_TIMESTAMP
 WHERE tag ~ '\s{2,}|\s+$' OR order_item ~ '\s{2,}|\s+$';
