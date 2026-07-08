-- GUN-जी database schema. Executed on every boot (CREATE ... IF NOT EXISTS).
-- Timestamps are ISO-8601 UTC text so SQLite and JS Date both parse them.
-- PRAGMA foreign_keys is set per-connection in index.js, not here.

-- ---------- users (shoppers + admin, distinguished by role) ----------
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,                 -- stored lowercased
  password_hash TEXT,                                 -- NULL for Google-only
  salt          TEXT,                                 -- NULL for Google-only
  google_id     TEXT UNIQUE,                          -- Google 'sub', nullable
  name          TEXT NOT NULL DEFAULT '',
  avatar_url    TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ---------- sessions (both admin + customer; token = SHA-256 hash) ----------
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- ---------- products ----------
CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  tag         TEXT NOT NULL DEFAULT '',
  price       INTEGER NOT NULL CHECK (price >= 0),    -- whole rupees
  price_from  INTEGER NOT NULL DEFAULT 0,             -- 1 = show "from Rs. X"
  edition     TEXT NOT NULL DEFAULT 'essentials',
  order_item  TEXT NOT NULL DEFAULT '',               -- DM-prefill label
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_products_active_sort ON products(active, sort_order);

-- ---------- product images ----------
CREATE TABLE IF NOT EXISTS product_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  url        TEXT NOT NULL,
  alt        TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id, sort_order);

-- ---------- product variants (size × colour inventory) ----------
CREATE TABLE IF NOT EXISTS product_variants (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  size       TEXT NOT NULL,
  color      TEXT NOT NULL,
  stock      INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sku        TEXT UNIQUE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE (product_id, size, color)
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

-- ---------- orders (header) ----------
CREATE TABLE IF NOT EXISTS orders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER,                            -- NULL = guest
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled')),
  total            INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0),
  shipping_name    TEXT NOT NULL DEFAULT '',
  shipping_address TEXT NOT NULL DEFAULT '',
  shipping_phone   TEXT NOT NULL DEFAULT '',
  contact          TEXT NOT NULL DEFAULT '',           -- DM handle / number (brand is DM-first)
  contact_method   TEXT NOT NULL DEFAULT 'instagram',
  note             TEXT NOT NULL DEFAULT '',
  admin_note       TEXT NOT NULL DEFAULT '',
  source           TEXT NOT NULL DEFAULT 'site',        -- site | manual
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ---------- order items (line items, with snapshots) ----------
CREATE TABLE IF NOT EXISTS order_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id          INTEGER NOT NULL,
  variant_id        INTEGER,                            -- NULL if variant later deleted
  product_id        INTEGER,                            -- convenience link, nullable
  product_name      TEXT NOT NULL,                      -- snapshot
  size              TEXT NOT NULL DEFAULT '',           -- snapshot
  color             TEXT NOT NULL DEFAULT '',           -- snapshot
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  price_at_purchase INTEGER NOT NULL CHECK (price_at_purchase >= 0),
  FOREIGN KEY (order_id)   REFERENCES orders(id)            ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id)  ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id)          ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ---------- settings (WhatsApp number + IG links; edited in /admin) ----------
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- ---------- custom print requests (the /custom-print inbox) ----------
CREATE TABLE IF NOT EXISTS custom_requests (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  contact       TEXT NOT NULL,
  method        TEXT NOT NULL DEFAULT 'instagram',
  idea          TEXT NOT NULL,
  colour        TEXT NOT NULL DEFAULT '',
  size          TEXT NOT NULL DEFAULT '',
  qty           INTEGER NOT NULL DEFAULT 1,
  reference_url TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'new',
  admin_note    TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_custom_status ON custom_requests(status);
