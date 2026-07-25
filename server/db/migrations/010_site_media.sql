-- Admin-uploaded storefront images. Keeping the bytes in Postgres makes the
-- media durable across Render/Vercel deploys where the runtime filesystem is
-- temporary or read-only.

CREATE TABLE IF NOT EXISTS site_media (
  id         SERIAL PRIMARY KEY,
  mime_type  TEXT NOT NULL,
  data       BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
