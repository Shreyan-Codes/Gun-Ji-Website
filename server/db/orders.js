import { db, tx } from "./index.js";
import { decrementStock } from "./products.js";

// Orders are a header row (orders) plus one or more line items (order_items).
// order_items snapshot product_name/size/color/price so history survives later
// edits. orderToJson also flattens the first item onto the top level so the
// current single-item UI + admin panel keep working unchanged.

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

const selectOrder = db.prepare("SELECT * FROM orders WHERE id = ?");
const selectItems = db.prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id");
const insertOrder = db.prepare(
  `INSERT INTO orders (user_id, status, total, shipping_name, shipping_address, shipping_phone, contact, contact_method, note, admin_note, source)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
const insertItem = db.prepare(
  `INSERT INTO order_items (order_id, variant_id, product_id, product_name, size, color, quantity, price_at_purchase)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

export function orderToJson(row) {
  const items = selectItems.all(row.id).map((i) => ({
    id: i.id,
    variantId: i.variant_id,
    productId: i.product_id,
    item: i.product_name,
    size: i.size,
    colour: i.color,
    qty: i.quantity,
    unitPrice: i.price_at_purchase,
    lineTotal: i.price_at_purchase * i.quantity,
  }));
  const first = items[0] || {};
  return {
    id: row.id,
    userId: row.user_id ?? null,
    status: row.status,
    total: row.total,
    shippingName: row.shipping_name,
    shippingAddress: row.shipping_address,
    shippingPhone: row.shipping_phone,
    contact: row.contact,
    method: row.contact_method,
    note: row.note,
    adminNote: row.admin_note,
    source: row.source,
    customerEmail: row.customer_email ?? null, // present when admin query joins users
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
    // ---- flattened first item (current UI is single-item) ----
    name: row.shipping_name,
    item: first.item ?? "",
    size: first.size ?? "",
    colour: first.colour ?? "",
    qty: first.qty ?? 1,
    unitPrice: first.unitPrice ?? 0,
  };
}

export const getOrder = (id) => {
  const row = selectOrder.get(id);
  return row ? orderToJson(row) : null;
};

// items: [{ variantId?, productId?, productName, size, color, quantity, priceAtPurchase }]
// items: [{ variantId?, productId?, productName, size, color, quantity, priceAtPurchase }]
// enforceStock: when true (cart checkout), a variant without enough stock aborts
// the whole order (throws "OUT_OF_STOCK:<variantId>", rolling back the tx).
export function createOrder({
  userId = null, status = "pending",
  shippingName = "", shippingAddress = "", shippingPhone = "",
  contact = "", contactMethod = "instagram", note = "", adminNote = "",
  source = "site", items = [], enforceStock = false,
}) {
  if (items.length === 0) throw new Error("An order needs at least one item");
  const total = items.reduce((sum, it) => sum + it.priceAtPurchase * it.quantity, 0);

  return tx(() => {
    const info = insertOrder.run(
      userId, status, total, shippingName, shippingAddress, shippingPhone,
      contact, contactMethod, note, adminNote, source
    );
    const orderId = Number(info.lastInsertRowid);
    for (const it of items) {
      insertItem.run(
        orderId, it.variantId ?? null, it.productId ?? null,
        it.productName, it.size ?? "", it.color ?? "", it.quantity, it.priceAtPurchase
      );
      if (it.variantId) {
        const ok = decrementStock(it.variantId, it.quantity);
        if (!ok && enforceStock) throw new Error(`OUT_OF_STOCK:${it.variantId}`);
      }
    }
    return getOrder(orderId);
  });
}

export function listOrdersByUser(userId) {
  return db.prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC").all(userId).map(orderToJson);
}

export function adminListOrders(status) {
  const base = `SELECT o.*, u.email AS customer_email
                FROM orders o LEFT JOIN users u ON u.id = o.user_id`;
  const rows = status
    ? db.prepare(`${base} WHERE o.status = ? ORDER BY o.id DESC`).all(status)
    : db.prepare(`${base} ORDER BY o.id DESC`).all();
  return rows.map(orderToJson);
}

const ORDER_COL = {
  status: "status", adminNote: "admin_note", note: "note",
  contact: "contact", method: "contact_method", total: "total",
  shippingName: "shipping_name", shippingAddress: "shipping_address", shippingPhone: "shipping_phone",
};

export function updateOrder(id, patch) {
  const sets = [];
  const params = [];
  for (const [key, col] of Object.entries(ORDER_COL)) {
    if (Object.hasOwn(patch, key)) { sets.push(`${col} = ?`); params.push(patch[key]); }
  }
  if (sets.length === 0) return getOrder(id);
  const info = db.prepare(`UPDATE orders SET ${sets.join(", ")}, updated_at = ${NOW} WHERE id = ?`).run(...params, id);
  return info.changes > 0 ? getOrder(id) : null;
}

export const deleteOrder = (id) => db.prepare("DELETE FROM orders WHERE id = ?").run(id).changes > 0;
