import { db } from "./index.js";

// Products, their images, and their size×colour variants. Kept thin: plain
// prepared-statement queries, no ORM. The JSON shape stays backward-compatible
// with the old single-image catalog (img/alt) while adding images[]/variants[].

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

const selectActive = db.prepare("SELECT * FROM products WHERE active = 1 ORDER BY sort_order, id");
const selectAll = db.prepare("SELECT * FROM products ORDER BY sort_order, id");
const selectById = db.prepare("SELECT * FROM products WHERE id = ?");
const selectBySlug = db.prepare("SELECT * FROM products WHERE slug = ?");
const selectImages = db.prepare("SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order, id");
const selectVariants = db.prepare("SELECT * FROM product_variants WHERE product_id = ? ORDER BY id");
const maxSort = db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS m FROM products");
const slugExists = db.prepare("SELECT 1 FROM products WHERE slug = ? AND id <> ?");

function uniqueSlug(name, ignoreId = 0) {
  let base = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "product";
  let slug = base;
  let n = 2;
  while (slugExists.get(slug, ignoreId)) slug = `${base}-${n++}`;
  return slug;
}

export function productToJson(row, { admin = false } = {}) {
  const images = selectImages.all(row.id);
  const variants = selectVariants.all(row.id);
  const primary = images[0];
  const out = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    tag: row.tag,
    price: row.price,
    priceFrom: !!row.price_from,
    img: primary?.url ?? "",   // back-compat single image
    alt: primary?.alt ?? "",
    orderItem: row.order_item,
    edition: row.edition,
    images: images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, sortOrder: i.sort_order })),
    variants: variants.map((v) => ({ id: v.id, size: v.size, color: v.color, stock: v.stock, sku: v.sku })),
    inStock: variants.some((v) => v.stock > 0),
  };
  if (admin) {
    out.description = row.description;
    out.sortOrder = row.sort_order;
    out.active = !!row.active;
    out.createdAt = row.created_at;
    out.updatedAt = row.updated_at;
  }
  return out;
}

export const listActiveProducts = () => selectActive.all().map((r) => productToJson(r));
export const listAllProducts = () => selectAll.all().map((r) => productToJson(r, { admin: true }));

export function getProduct(idOrSlug, { admin = false } = {}) {
  const row = typeof idOrSlug === "number" || /^\d+$/.test(idOrSlug)
    ? selectById.get(Number(idOrSlug))
    : selectBySlug.get(String(idOrSlug));
  return row ? productToJson(row, { admin }) : null;
}

// Raw row (no relations) — used internally by the order flow for price snapshots.
export const getProductRow = (id) => selectById.get(id) || null;

export function createProduct(fields) {
  const slug = fields.slug ? uniqueSlug(fields.slug) : uniqueSlug(fields.name);
  const sortOrder = fields.sortOrder ?? maxSort.get().m + 10;
  const info = db.prepare(
    `INSERT INTO products (name, slug, description, tag, price, price_from, edition, order_item, sort_order, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    fields.name, slug, fields.description ?? "", fields.tag ?? "", fields.price,
    fields.priceFrom ?? 0, fields.edition ?? "essentials", fields.orderItem || fields.name,
    sortOrder, fields.active ?? 1
  );
  return getProduct(Number(info.lastInsertRowid), { admin: true });
}

const COL = {
  name: "name", description: "description", tag: "tag", price: "price",
  priceFrom: "price_from", edition: "edition", orderItem: "order_item",
  sortOrder: "sort_order", active: "active",
};

export function updateProduct(id, patch) {
  const sets = [];
  const params = [];
  for (const [key, col] of Object.entries(COL)) {
    if (Object.hasOwn(patch, key)) { sets.push(`${col} = ?`); params.push(patch[key]); }
  }
  if (Object.hasOwn(patch, "name") && !Object.hasOwn(patch, "slug")) {
    sets.push("slug = ?");
    params.push(uniqueSlug(patch.name, id));
  }
  if (sets.length === 0) return getProduct(id, { admin: true });
  db.prepare(`UPDATE products SET ${sets.join(", ")}, updated_at = ${NOW} WHERE id = ?`).run(...params, id);
  return selectById.get(id) ? getProduct(id, { admin: true }) : null;
}

export function setProductActive(id, active) {
  const info = db.prepare(`UPDATE products SET active = ?, updated_at = ${NOW} WHERE id = ?`).run(active ? 1 : 0, id);
  return info.changes > 0;
}

export function deleteProduct(id) {
  return db.prepare("DELETE FROM products WHERE id = ?").run(id).changes > 0; // images/variants cascade
}

// ---------- images ----------
export function addImage(productId, { url, alt = "", sortOrder = 0 }) {
  const info = db.prepare(
    "INSERT INTO product_images (product_id, url, alt, sort_order) VALUES (?, ?, ?, ?)"
  ).run(productId, url, alt, sortOrder);
  return Number(info.lastInsertRowid);
}
export const deleteImage = (id) => db.prepare("DELETE FROM product_images WHERE id = ?").run(id).changes > 0;

// Sets the product's primary (first) image — updates it in place, or inserts
// one if the product has none. Keeps the admin dashboard's single-image form
// working against the new images table.
export function setPrimaryImage(productId, url, alt = "") {
  const primary = selectImages.all(productId)[0];
  if (primary) {
    db.prepare("UPDATE product_images SET url = ?, alt = ? WHERE id = ?").run(url, alt, primary.id);
  } else {
    addImage(productId, { url, alt });
  }
}

// ---------- variants ----------
const findVariantStmt = db.prepare(
  "SELECT * FROM product_variants WHERE product_id = ? AND size = ? AND color = ?"
);

export function findVariant(productId, size, color) {
  return findVariantStmt.get(productId, size, color) || null;
}

const selectVariantById = db.prepare("SELECT * FROM product_variants WHERE id = ?");
export const getVariantById = (id) => selectVariantById.get(id) || null;

// Variant joined with the parent product — used at checkout to snapshot the
// price/name and check the product is still active.
const selectVariantWithProduct = db.prepare(
  `SELECT v.id AS variant_id, v.product_id, v.size, v.color, v.stock, v.sku,
          p.name AS product_name, p.order_item, p.price, p.active AS product_active
     FROM product_variants v JOIN products p ON p.id = v.product_id
    WHERE v.id = ?`
);
export const getVariantWithProduct = (id) => selectVariantWithProduct.get(id) || null;

export function addVariant(productId, { size, color, stock = 0, sku = null }) {
  const info = db.prepare(
    "INSERT INTO product_variants (product_id, size, color, stock, sku) VALUES (?, ?, ?, ?, ?)"
  ).run(productId, size, color, stock, sku);
  return Number(info.lastInsertRowid);
}

export function setVariantStock(id, stock) {
  return db.prepare("UPDATE product_variants SET stock = ? WHERE id = ?").run(Math.max(0, stock), id).changes > 0;
}

// Decrements stock only if enough is available; returns true if it did.
export function decrementStock(variantId, qty) {
  const info = db.prepare(
    "UPDATE product_variants SET stock = stock - ? WHERE id = ? AND stock >= ?"
  ).run(qty, variantId, qty);
  return info.changes > 0;
}
