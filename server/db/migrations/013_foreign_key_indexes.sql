-- Cover foreign keys used during product/variant deletion and wishlist joins.
CREATE INDEX IF NOT EXISTS idx_order_items_variant ON order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_variant ON wishlist(variant_id);
