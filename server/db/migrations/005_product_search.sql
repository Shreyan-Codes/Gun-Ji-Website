-- Phase 3f: full-text search. Postgres tsvector (SQLite FTS5 does not exist
-- here). Generated column stays in sync automatically; GIN index makes @@ fast.
-- Idempotent.

ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'english',
      coalesce(name, '') || ' ' || coalesce(description, '') || ' ' ||
      coalesce(tag, '') || ' ' || coalesce(edition, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN (search_vector);
