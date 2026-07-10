-- Phase 3c: wishlist. One row per (customer, variant). Idempotent.

CREATE TABLE IF NOT EXISTS wishlist (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, variant_id)
);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id);
