-- Retires the four illustrated print editions from the shop:
--   La Albiceleste ’22, Mbappé № 10, Jiraiya — Gama Sennin, USE दिमाग
-- (editions player / anime / desi). The signature logo tees, the plain
-- Essentials and Custom Print all stay live.
--
-- Deactivated, NOT deleted: order_items reference products, and the owner may
-- want to relist a design later. Flipping `active` back on in /admin restores a
-- product exactly as it was — a DELETE would cascade its images and variants
-- away for good.
--
-- Idempotent: the second run matches no rows.

UPDATE products
   SET active = 0, updated_at = CURRENT_TIMESTAMP
 WHERE edition IN ('player', 'anime', 'desi')
   AND active = 1;
