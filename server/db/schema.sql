-- GUN-जी database schema. Executed on every boot (CREATE ... IF NOT EXISTS).
-- Timestamps are TIMESTAMPTZ.

-- ---------- users (shoppers + admin, distinguished by role) ----------
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,                 -- stored lowercased
  password_hash TEXT,                                 -- NULL for Google-only
  salt          TEXT,                                 -- NULL for Google-only
  google_id     TEXT UNIQUE,                          -- Google 'sub', nullable
  name          TEXT NOT NULL DEFAULT '',
  avatar_url    TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------- sessions (both admin + customer; token = SHA-256 hash) ----------
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- ---------- products ----------
CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  tag         TEXT NOT NULL DEFAULT '',
  price       INTEGER NOT NULL CHECK (price >= 0),    -- whole rupees
  price_from  INTEGER NOT NULL DEFAULT 0,             -- 1 = show "from Rs. X"
  compare_at_price INTEGER CHECK (compare_at_price IS NULL OR compare_at_price >= 0), -- struck "was" price; NULL = no sale
  edition     TEXT NOT NULL DEFAULT 'signature',
  order_item  TEXT NOT NULL DEFAULT '',               -- DM-prefill label
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_active_sort ON products(active, sort_order);

-- ---------- product images ----------
CREATE TABLE IF NOT EXISTS product_images (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  alt        TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id, sort_order);

-- ---------- product variants (size × colour inventory) ----------
CREATE TABLE IF NOT EXISTS product_variants (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size       TEXT NOT NULL CONSTRAINT product_variants_size_check
             CHECK (size IN ('S', 'M', 'L')),
  color      TEXT NOT NULL,
  stock      INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sku        TEXT UNIQUE,
  UNIQUE (product_id, size, color)
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

-- ---------- coupons ----------
CREATE TABLE IF NOT EXISTS coupons (
  id               SERIAL PRIMARY KEY,
  code             TEXT NOT NULL UNIQUE,
  description      TEXT NOT NULL DEFAULT '',
  discount_type    TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value   INTEGER NOT NULL CHECK (discount_value > 0),
  min_order_amount INTEGER NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
  max_uses         INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  max_discount_items INTEGER CONSTRAINT coupons_max_discount_items_check
                     CHECK (max_discount_items IS NULL OR max_discount_items > 0),
  uses_count       INTEGER NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  valid_from       TIMESTAMPTZ,
  valid_until      TIMESTAMPTZ,
  active           INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (discount_type <> 'percent' OR discount_value <= 100),
  CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from)
);
CREATE INDEX IF NOT EXISTS idx_coupons_active_code ON coupons(active, code);
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- ---------- orders (header) ----------
CREATE TABLE IF NOT EXISTS orders (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled')),
  subtotal         INTEGER NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount         INTEGER NOT NULL DEFAULT 0 CHECK (discount >= 0 AND discount <= subtotal),
  total            INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0),
  coupon_id        INTEGER REFERENCES coupons(id) ON DELETE SET NULL,
  coupon_code      TEXT,
  shipping_name    TEXT NOT NULL DEFAULT '',
  shipping_address TEXT NOT NULL DEFAULT '',
  shipping_phone   TEXT NOT NULL DEFAULT '',
  contact          TEXT NOT NULL DEFAULT '',           -- DM handle / number (brand is DM-first)
  contact_method   TEXT NOT NULL DEFAULT 'instagram',
  note             TEXT NOT NULL DEFAULT '',
  admin_note       TEXT NOT NULL DEFAULT '',
  source           TEXT NOT NULL DEFAULT 'site',        -- site | manual
  created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_coupon ON orders(coupon_id);

-- Optional GPS delivery pin shared by the customer at checkout (opt-in,
-- nullable). ADD COLUMN IF NOT EXISTS so this also upgrades existing DBs.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS location_lat      DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS location_lng      DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS location_accuracy INTEGER;

-- ---------- order items (line items, with snapshots) ----------
CREATE TABLE IF NOT EXISTS order_items (
  id                SERIAL PRIMARY KEY,
  order_id          INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id        INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
  product_id        INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name      TEXT NOT NULL,                      -- snapshot
  size              TEXT NOT NULL DEFAULT '',           -- snapshot
  color             TEXT NOT NULL DEFAULT '',           -- snapshot
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  price_at_purchase INTEGER NOT NULL CHECK (price_at_purchase >= 0)
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant ON order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- ---------- settings (WhatsApp number + IG links; edited in /admin) ----------
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- ---------- custom print requests (the /custom-print inbox) ----------
CREATE TABLE IF NOT EXISTS custom_requests (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  contact       TEXT NOT NULL,
  method        TEXT NOT NULL DEFAULT 'instagram',
  idea          TEXT NOT NULL,
  colour        TEXT NOT NULL DEFAULT '',
  size          TEXT NOT NULL DEFAULT '' CONSTRAINT custom_requests_size_check
                CHECK (size IN ('', 'S', 'M', 'L')),
  qty           INTEGER NOT NULL DEFAULT 1,
  reference_url TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'new',
  admin_note    TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_custom_status ON custom_requests(status);

-- The browser never connects to Supabase directly. Keep all application data
-- private from Data API roles; the trusted server uses the postgres connection.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_requests ENABLE ROW LEVEL SECURITY;
