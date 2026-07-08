import { Router } from "express";
import { config } from "../config.js";
import { db } from "../db/index.js";
import { clean, ORDER_STATUSES, CUSTOM_STATUSES, CONTACT_METHODS, EDITIONS } from "../lib/validate.js";
import { rateLimit } from "../lib/rateLimit.js";
import { verifyPassword } from "../lib/password.js";
import { bearer, requireAdmin } from "../lib/authMiddleware.js";
import { createSession, destroySession } from "../db/sessions.js";
import { findAdmin } from "../db/users.js";
import { getSettings, setSetting } from "../db/settings.js";
import {
  listAllProducts, getProduct, createProduct, updateProduct,
  setProductActive, deleteProduct, addVariant, setPrimaryImage,
} from "../db/products.js";
import { adminListOrders, createOrder, updateOrder, deleteOrder } from "../db/orders.js";
import { listCustomRequests, updateCustomRequest, deleteCustomRequest } from "../db/customRequests.js";

const router = Router();
const loginLimit = rateLimit({ name: "login", windowMs: 15 * 60 * 1000, max: 5 });

// ---------- helpers ----------

function idParam(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Bad id" });
    return null;
  }
  return id;
}

// Keep only the fields the client actually sent; enum/int/bool become required
// once present so `{"status":""}` errors instead of writing an empty value.
function pick(spec, body) {
  const subset = {};
  for (const key of Object.keys(spec)) {
    if (body && Object.hasOwn(body, key)) {
      const rule = spec[key];
      subset[key] = rule.enum || rule.type === "int" || rule.type === "bool" ? { ...rule, required: true } : rule;
    }
  }
  return subset;
}

// ---------- auth ----------

router.post("/login", loginLimit, async (req, res) => {
  const admin = await findAdmin();
  if (!admin || !config.adminPassword) {
    return res.status(503).json({ error: "Admin login is disabled — set ADMIN_PASSWORD in .env and restart." });
  }
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!verifyPassword(password, admin.password_hash, admin.salt)) {
    return res.status(401).json({ error: "Wrong password" });
  }
  res.json(await createSession(admin.id, config.sessionTtlMs));
});

router.use(requireAdmin);

router.post("/logout", async (req, res) => {
  await destroySession(bearer(req));
  res.json({ ok: true });
});

router.get("/me", (req, res) => res.json({ ok: true, expiresAt: req.sessionExpiresAt }));

router.get("/stats", async (req, res) => {
  const group = async (table) =>
    Object.fromEntries(
      (await db.prepare(`SELECT status, COUNT(*) AS c FROM ${table} GROUP BY status`).all()).map((r) => [r.status, r.c])
    );
  const orders = await group("orders");
  const customRequests = await group("custom_requests");
  const products = await db.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(active), 0) AS active FROM products").get();
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  res.json({
    orders: { byStatus: orders, total: sum(orders) },
    customRequests: { byStatus: customRequests, total: sum(customRequests) },
    products: { total: products.total, active: products.active },
  });
});

// ---------- orders ----------

const orderFields = {
  item: { max: 160 },
  name: { max: 80 },
  contact: { max: 120 },
  method: { enum: CONTACT_METHODS },
  size: { max: 20 },
  qty: { type: "int", min: 1, max: 99 },
  colour: { max: 40 },
  unitPrice: { type: "int", min: 0, max: 1000000 },
  note: { max: 1000 },
  status: { enum: ORDER_STATUSES },
  adminNote: { max: 1000 },
};

router.get("/orders", async (req, res) => {
  const status = req.query.status;
  if (status && !ORDER_STATUSES.includes(status)) return res.status(400).json({ error: "Unknown status filter" });
  res.json({ items: await adminListOrders(status) });
});

// Manual entry — log an order that arrived via DM.
router.post("/orders", async (req, res) => {
  const { ok, errors, value } = clean(
    {
      ...orderFields,
      item: { ...orderFields.item, required: true },
      name: { ...orderFields.name, required: true },
      contact: { ...orderFields.contact, required: true },
      method: { ...orderFields.method, default: "instagram" },
      qty: { ...orderFields.qty, default: 1 },
      unitPrice: { ...orderFields.unitPrice, default: 0 },
      status: { ...orderFields.status, default: "pending" },
    },
    req.body
  );
  if (!ok) return res.status(400).json({ error: "Check the fields", errors });
  const order = await createOrder({
    status: value.status,
    shippingName: value.name,
    contact: value.contact,
    contactMethod: value.method,
    note: value.note,
    adminNote: value.adminNote,
    source: "manual",
    items: [{
      variantId: null, productId: null, productName: value.item,
      size: value.size, color: value.colour, quantity: value.qty, priceAtPurchase: value.unitPrice,
    }],
  });
  res.status(201).json({ item: order });
});

// Order-level edits (status, notes, contact, shipping). Line-item edits aren't
// exposed here yet — that comes with the variant-aware order editor.
const orderPatchFields = {
  status: { enum: ORDER_STATUSES },
  adminNote: { max: 1000 },
  note: { max: 1000 },
  contact: { max: 120 },
  method: { enum: CONTACT_METHODS },
  shippingName: { max: 80 },
  shippingAddress: { max: 300 },
  shippingPhone: { max: 40 },
};

router.patch("/orders/:id", async (req, res) => {
  const id = idParam(req, res);
  if (id === null) return;
  const { ok, errors, value } = clean(pick(orderPatchFields, req.body), req.body);
  if (!ok) return res.status(400).json({ error: "Check the fields", errors });
  const order = await updateOrder(id, value);
  if (!order) return res.status(404).json({ error: "Not found" });
  res.json({ item: order });
});

router.delete("/orders/:id", async (req, res) => {
  const id = idParam(req, res);
  if (id === null) return;
  if (!(await deleteOrder(id))) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// ---------- custom requests ----------

const customPatchFields = { status: { enum: CUSTOM_STATUSES }, adminNote: { max: 1000 } };

router.get("/custom-requests", async (req, res) => {
  const status = req.query.status;
  if (status && !CUSTOM_STATUSES.includes(status)) return res.status(400).json({ error: "Unknown status filter" });
  res.json({ items: await listCustomRequests(status) });
});

router.patch("/custom-requests/:id", async (req, res) => {
  const id = idParam(req, res);
  if (id === null) return;
  const { ok, errors, value } = clean(pick(customPatchFields, req.body), req.body);
  if (!ok) return res.status(400).json({ error: "Check the fields", errors });
  const item = await updateCustomRequest(id, value);
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json({ item });
});

router.delete("/custom-requests/:id", async (req, res) => {
  const id = idParam(req, res);
  if (id === null) return;
  if (!(await deleteCustomRequest(id))) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// ---------- products ----------

const productFields = {
  name: { max: 120 },
  description: { max: 2000 },
  tag: { max: 160 },
  price: { type: "int", min: 0, max: 1000000 },
  priceFrom: { type: "bool" },
  img: { max: 300 },
  alt: { max: 300 },
  orderItem: { max: 160 },
  edition: { enum: EDITIONS },
  sortOrder: { type: "int", min: 0, max: 1000000 },
  active: { type: "bool" },
};

router.get("/products", async (req, res) => res.json({ items: await listAllProducts() }));

router.post("/products", async (req, res) => {
  const { ok, errors, value } = clean(
    {
      ...productFields,
      name: { ...productFields.name, required: true },
      price: { ...productFields.price, required: true },
      img: { ...productFields.img, required: true },
      edition: { ...productFields.edition, default: "essentials" },
      active: { ...productFields.active, default: 1 },
    },
    req.body
  );
  if (!ok) return res.status(400).json({ error: "Check the fields", errors });

  const product = await createProduct({
    name: value.name, description: value.description, tag: value.tag, price: value.price,
    priceFrom: value.priceFrom, edition: value.edition, orderItem: value.orderItem,
    sortOrder: value.sortOrder === "" ? undefined : value.sortOrder, active: value.active,
  });
  await setPrimaryImage(product.id, value.img, value.alt);
  // Give new products a placeholder variant so they have valid inventory rows;
  // real sizes/stock are managed later in the variant editor.
  await addVariant(product.id, { size: "One size", color: "As shown", stock: 0 });
  res.status(201).json({ item: await getProduct(product.id, { admin: true }) });
});

router.patch("/products/:id", async (req, res) => {
  const id = idParam(req, res);
  if (id === null) return;
  const { ok, errors, value } = clean(pick(productFields, req.body), req.body);
  if (!ok) return res.status(400).json({ error: "Check the fields", errors });

  const { img, alt, ...rest } = value;
  const updated = await updateProduct(id, rest);
  if (!updated) return res.status(404).json({ error: "Not found" });
  if (Object.hasOwn(value, "img")) await setPrimaryImage(id, img, alt ?? updated.alt ?? "");
  res.json({ item: await getProduct(id, { admin: true }) });
});

// Soft delete (hide) by default; ?hard=1 removes the row (+ images/variants).
router.delete("/products/:id", async (req, res) => {
  const id = idParam(req, res);
  if (id === null) return;
  const done = req.query.hard === "1" ? await deleteProduct(id) : await setProductActive(id, false);
  if (!done) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// ---------- settings ----------

router.put("/settings", async (req, res) => {
  const body = req.body || {};
  const digits = typeof body.whatsappNumber === "string" ? body.whatsappNumber.replace(/[^\d]/g, "") : "";
  const { ok, errors, value } = clean(
    {
      whatsappNumber: { max: 15, pattern: /^\d{8,15}$/, patternMsg: "8–15 digits, country code first (e.g. 9779812345678)" },
      igDm: { max: 300, pattern: /^https:\/\//, patternMsg: "Must be an https:// link" },
      igProfile: { max: 300, pattern: /^https:\/\//, patternMsg: "Must be an https:// link" },
    },
    { ...body, whatsappNumber: digits }
  );
  if (!ok) return res.status(400).json({ error: "Check the fields", errors });

  if (Object.hasOwn(body, "whatsappNumber")) await setSetting("whatsapp_number", value.whatsappNumber);
  if (value.igDm) await setSetting("ig_dm", value.igDm);
  if (value.igProfile) await setSetting("ig_profile", value.igProfile);
  res.json(await getSettings());
});

export default router;
