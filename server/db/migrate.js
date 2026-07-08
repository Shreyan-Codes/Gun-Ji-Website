// One-time, idempotent migration from the old single-file schema (server/db.js)
// to the normalized schema. Runs on boot:
//   preSchema()  — before schema.sql: rename/drop tables whose shape changed
//   postSchema() — after schema.sql:  copy legacy data into the new tables
// `settings` and `custom_requests` are unchanged, so they're never touched and
// their data (e.g. the WhatsApp number) survives automatically.

export function tableExists(db, name) {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?").get(name);
}

function hasColumn(db, table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
}

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

export function preSchema(db) {
  // Old products lacked `slug`; old orders had an `item` column.
  if (tableExists(db, "products") && !hasColumn(db, "products", "slug")) {
    db.exec("ALTER TABLE products RENAME TO legacy_products;");
  }
  if (tableExists(db, "orders") && hasColumn(db, "orders", "item")) {
    db.exec("ALTER TABLE orders RENAME TO legacy_orders;");
  }
  if (tableExists(db, "customers")) {
    db.exec("ALTER TABLE customers RENAME TO legacy_customers;");
  }
  // Sessions are ephemeral — drop the old shapes so everyone just logs in again.
  if (tableExists(db, "sessions") && !hasColumn(db, "sessions", "user_id")) {
    db.exec("DROP TABLE sessions;");
  }
  if (tableExists(db, "customer_sessions")) {
    db.exec("DROP TABLE customer_sessions;");
  }
}

export function postSchema(db) {
  if (!tableExists(db, "legacy_customers") &&
      !tableExists(db, "legacy_products") &&
      !tableExists(db, "legacy_orders")) {
    return; // nothing to migrate
  }

  const slugify = (name, taken) => {
    let base = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!base) base = "product";
    let slug = base;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
    taken.add(slug);
    return slug;
  };

  db.exec("BEGIN");
  try {
    let customers = 0, products = 0, orders = 0;

    // ---- customers → users (preserve ids so orders still map) ----
    if (tableExists(db, "legacy_customers")) {
      const rows = db.prepare("SELECT * FROM legacy_customers").all();
      const insert = db.prepare(
        `INSERT INTO users (id, email, name, password_hash, salt, google_id, avatar_url, role, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'customer', ?)`
      );
      for (const c of rows) {
        // old format: password_hash = "scrypt$<saltHex>$<hashHex>"
        let hash = null, salt = null;
        if (typeof c.password_hash === "string" && c.password_hash.startsWith("scrypt$")) {
          const [, s, h] = c.password_hash.split("$");
          hash = h || null;
          salt = s || null;
        }
        insert.run(c.id, c.email, c.name ?? "", hash, salt, c.google_sub ?? null, c.avatar_url ?? "", c.created_at);
        customers++;
      }
      db.exec("DROP TABLE legacy_customers;");
    }

    // ---- products → products + product_images + default variant ----
    if (tableExists(db, "legacy_products")) {
      const rows = db.prepare("SELECT * FROM legacy_products ORDER BY id").all();
      const taken = new Set();
      const insertP = db.prepare(
        `INSERT INTO products (id, name, slug, description, tag, price, price_from, edition, order_item, sort_order, active, created_at, updated_at)
         VALUES (?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const insertImg = db.prepare(
        "INSERT INTO product_images (product_id, url, alt, sort_order) VALUES (?, ?, ?, 0)"
      );
      const insertVar = db.prepare(
        "INSERT INTO product_variants (product_id, size, color, stock) VALUES (?, 'One size', 'As shown', 0)"
      );
      for (const p of rows) {
        insertP.run(
          p.id, p.name, slugify(p.name, taken), p.tag ?? "", p.price, p.price_from ?? 0,
          p.edition ?? "essentials", p.order_item ?? "", p.sort_order ?? 0, p.active ?? 1,
          p.created_at, p.updated_at
        );
        if (p.img) insertImg.run(p.id, p.img, p.alt ?? "");
        insertVar.run(p.id); // placeholder variant; owner sets real stock in admin
        products++;
      }
      db.exec("DROP TABLE legacy_products;");
    }

    // ---- orders → orders + order_items ----
    if (tableExists(db, "legacy_orders")) {
      const rows = db.prepare("SELECT * FROM legacy_orders ORDER BY id").all();
      const statusMap = { new: "pending", contacted: "pending", confirmed: "confirmed", delivered: "delivered", cancelled: "cancelled" };
      const userExists = db.prepare("SELECT 1 FROM users WHERE id = ?");
      const productExists = db.prepare("SELECT 1 FROM products WHERE id = ?");
      const insertO = db.prepare(
        `INSERT INTO orders (id, user_id, status, total, shipping_name, contact, contact_method, note, admin_note, source, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const insertI = db.prepare(
        `INSERT INTO order_items (order_id, variant_id, product_id, product_name, size, color, quantity, price_at_purchase)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?)`
      );
      for (const o of rows) {
        const userId = o.customer_id && userExists.get(o.customer_id) ? o.customer_id : null;
        const productId = o.product_id && productExists.get(o.product_id) ? o.product_id : null;
        const qty = o.qty ?? 1;
        const unit = o.unit_price ?? 0;
        insertO.run(
          o.id, userId, statusMap[o.status] ?? "pending", unit * qty,
          o.name ?? "", o.contact ?? "", o.method ?? "instagram",
          o.note ?? "", o.admin_note ?? "", o.source ?? "site", o.created_at, o.updated_at
        );
        insertI.run(o.id, productId, o.item ?? o.name ?? "Order", o.size ?? "", o.colour ?? "", qty, unit);
        orders++;
      }
      db.exec("DROP TABLE legacy_orders;");
    }

    console.log(`[db] migrated: ${customers} customer(s), ${products} product(s), ${orders} order(s)`);
    db.exec("COMMIT");
  } catch (err) {
    try { db.exec("ROLLBACK"); } catch { /* already rolled back */ }
    console.error("[db] migration failed:", err.message);
    throw err;
  }
}
