import { Router, json } from "express";
import { clean, CONTACT_METHODS } from "../lib/validate.js";
import { rateLimit } from "../lib/rateLimit.js";
import { requireCustomer } from "../lib/authMiddleware.js";
import { getSettings } from "../db/settings.js";
import { listActiveProducts, listProductsFiltered, searchProducts, getProduct, getProductRow, findVariant, getVariantWithProduct } from "../db/products.js";
import { createOrder, getOrderByTrackingCode } from "../db/orders.js";
import { createCustomRequest } from "../db/customRequests.js";
import { notifyNewOrder, notifyNewCustomRequest, notifyPaymentProof } from "../lib/notify.js";
import { logOrderToSheet, logCustomRequestToSheet } from "../lib/sheets.js";

const router = Router();
const submitLimit = rateLimit({ name: "submit", windowMs: 10 * 60 * 1000, max: 8 });

router.get("/health", async (req, res) => {
  const products = await listActiveProducts();
  res.json({ ok: true, uptimeSec: Math.round(process.uptime()), products: products.length });
});

router.get("/settings", async (req, res) => res.json(await getSettings()));

const EDITIONS = new Set(["player", "anime", "desi", "essentials", "custom"]);
const SORTS = new Set(["newest", "price_asc", "price_desc", "name_asc"]);

router.get("/products", async (req, res) => {
  const q = req.query;
  const hasFilter = q.sort || q.collection || q.size || q.color || q.inStock;
  if (!hasFilter) return res.json({ products: await listActiveProducts() });
  const str = (v, max) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : undefined);
  res.json({
    products: await listProductsFiltered({
      sort: SORTS.has(q.sort) ? q.sort : undefined,
      collection: EDITIONS.has(q.collection) ? q.collection : undefined,
      size: str(q.size, 20),
      color: str(q.color, 30),
      inStock: q.inStock === "1" || q.inStock === "true",
    }),
  });
});

const searchLimit = rateLimit({ name: "search", windowMs: 60 * 1000, max: 60 });
router.get("/search", searchLimit, async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.slice(0, 80) : "";
  res.json({ query: q, results: await searchProducts(q) });
});

router.get("/products/:idOrSlug", async (req, res) => {
  const product = await getProduct(req.params.idOrSlug);
  // Only expose active products publicly.
  if (!product || !(await getProductRow(product.id))?.active) {
    return res.status(404).json({ error: "Product not found" });
  }
  res.json({ product });
});

const contactSpec = {
  name: { required: true, max: 80 },
  contact: { required: true, max: 120 },
  method: { enum: CONTACT_METHODS, default: "instagram" },
  size: { max: 20 },
  qty: { type: "int", min: 1, max: 99, default: 1 },
  colour: { max: 40 },
  website: { max: 200 }, // honeypot
};

// POST /api/orders handles two shapes:
//   { items: [{ variantId, qty }], name, contact, ... }  → cart checkout (stock-enforced)
//   { productId, size, colour, qty, name, contact, ... }  → legacy single-item
router.post("/orders", submitLimit, requireCustomer, async (req, res) => {
  // Honeypot short-circuit for both paths.
  if (typeof req.body?.website === "string" && req.body.website.trim()) {
    return res.status(201).json({ ok: true });
  }
  if (Array.isArray(req.body?.items) && req.body.items.length > 0) {
    return placeCartOrder(req, res);
  }
  return placeSingleOrder(req, res);
});

// eSewa payment screenshot → forwarded to the owner (Telegram). Own body parser
// because the global one caps at 32kb. Rate-limited; image-only; not stored.
// Public order tracking (no login). Returns a safe subset only — NEVER the
// customer's name, phone, address or email. Rate-limited: 10/min per IP.
const TRACK_FLOW = [
  { key: "pending", label: "Placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "shipped", label: "Dispatched" },
  { key: "delivered", label: "Delivered" },
];
function buildTimeline(status) {
  if (status === "cancelled") {
    return [
      { key: "pending", label: "Placed", done: true, current: false },
      { key: "cancelled", label: "Cancelled", done: true, current: true },
    ];
  }
  const idx = TRACK_FLOW.findIndex((s) => s.key === status);
  return TRACK_FLOW.map((s, i) => ({ key: s.key, label: s.label, done: i <= idx, current: i === idx }));
}

const trackLimit = rateLimit({ name: "track", windowMs: 60 * 1000, max: 10 });
router.get("/track/:code", trackLimit, async (req, res) => {
  const code = String(req.params.code || "").trim().toUpperCase();
  if (!/^GJ-[0-9A-F]{10}$/.test(code)) return res.status(400).json({ error: "That doesn't look like a tracking code." });
  const order = await getOrderByTrackingCode(code);
  if (!order) return res.status(404).json({ error: "No order with that code." });
  res.json({
    code: order.trackingCode,
    status: order.status,
    placedAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: (order.items || []).map((i) => ({
      name: i.item,
      variant: [i.size, i.colour].filter(Boolean).join(" / "),
      qty: i.qty,
    })),
    timeline: buildTimeline(order.status),
  });
});

const proofLimit = rateLimit({ name: "proof", windowMs: 10 * 60 * 1000, max: 10 });
router.post("/orders/:id/payment-proof", proofLimit, json({ limit: "8mb" }), (req, res) => {
  const id = Number(req.params.id);
  const image = req.body?.image;
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Bad order id" });
  if (typeof image !== "string" || !image.startsWith("data:image/") || image.length > 8_000_000) {
    return res.status(400).json({ error: "Invalid image" });
  }
  notifyPaymentProof(id, image); // fire-and-forget
  res.status(202).json({ ok: true });
});

const checkoutSpec = {
  name: { required: true, max: 80 },
  contact: { required: true, max: 120 },
  method: { enum: CONTACT_METHODS, default: "instagram" },
  shippingAddress: { max: 300 },
  shippingPhone: { max: 40 },
  note: { max: 1000 },
  paymentMethod: { enum: ["cod", "esewa", "khalti"], default: "cod" },
  // Optional GPS delivery pin (opt-in "Share my location" button at checkout).
  locationLat: { type: "num", min: -90, max: 90 },
  locationLng: { type: "num", min: -180, max: 180 },
  locationAccuracy: { type: "int", min: 0, max: 100000 },
};

async function placeCartOrder(req, res) {
  const { ok, errors, value } = clean(checkoutSpec, req.body);
  if (!ok) return res.status(400).json({ error: "Check your details", errors });

  const raw = req.body.items;
  if (raw.length > 20) return res.status(400).json({ error: "That's a lot of tees — please DM us for a bulk order." });

  const items = [];
  const problems = [];
  for (const line of raw) {
    const variantId = Number(line?.variantId);
    const qty = Number(line?.qty);
    if (!Number.isInteger(variantId) || variantId < 1 || !Number.isInteger(qty) || qty < 1 || qty > 99) {
      problems.push({ variantId: line?.variantId ?? null, error: "Invalid item" });
      continue;
    }
    const v = await getVariantWithProduct(variantId);
    if (!v || !v.product_active) { problems.push({ variantId, error: "No longer available" }); continue; }
    if (v.stock < qty) { problems.push({ variantId, stock: v.stock, error: v.stock > 0 ? `Only ${v.stock} left` : "Out of stock" }); continue; }
    items.push({
      variantId, productId: v.product_id, productName: v.order_item || v.product_name,
      size: v.size, color: v.color, quantity: qty, priceAtPurchase: v.price,
    });
  }
  if (problems.length) return res.status(409).json({ error: "Some items need a look", items: problems });
  if (items.length === 0) return res.status(400).json({ error: "Your cart is empty" });

  try {
    const order = await createOrder({
      userId: req.user ? req.user.id : null,
      shippingName: value.name,
      shippingAddress: value.shippingAddress,
      shippingPhone: value.shippingPhone,
      contact: value.contact,
      contactMethod: value.method,
      note: value.note,
      paymentMethod: value.paymentMethod,
      source: "site",
      items,
      enforceStock: true,
      // Only persist the pin when both coordinates came through.
      locationLat: value.locationLat,
      locationLng: value.locationLng,
      locationAccuracy: value.locationLat !== null && value.locationLng !== null ? value.locationAccuracy : null,
    });
    notifyNewOrder(order); // fire-and-forget owner alert
    logOrderToSheet(order); // fire-and-forget Google Sheet log
    res.status(201).json({ ok: true, id: order.id, order });
  } catch (err) {
    if (String(err.message).startsWith("OUT_OF_STOCK")) {
      return res.status(409).json({ error: "An item just sold out — please review your cart." });
    }
    throw err;
  }
}

async function placeSingleOrder(req, res) {
  const { ok, errors, value } = clean(
    { ...contactSpec, productId: { type: "int", min: 1 }, item: { max: 160 }, note: { max: 1000 } },
    req.body
  );
  if (!ok) return res.status(400).json({ error: "Check the highlighted fields", errors });

  let item = value.item;
  let unitPrice = 0;
  let productId = null;
  let variantId = null;
  if (value.productId) {
    const product = await getProductRow(value.productId);
    if (!product || !product.active) {
      return res.status(400).json({ error: "Check the highlighted fields", errors: { productId: "Unknown product" } });
    }
    item = product.order_item || product.name;
    unitPrice = product.price;
    productId = product.id;
    variantId = (await findVariant(product.id, value.size, value.colour))?.id ?? null;
  }
  if (!item) {
    return res.status(400).json({ error: "Check the highlighted fields", errors: { item: "Tell us which tee" } });
  }

  const order = await createOrder({
    userId: req.user ? req.user.id : null,
    shippingName: value.name,
    contact: value.contact,
    contactMethod: value.method,
    note: value.note,
    source: "site",
    items: [{
      variantId, productId, productName: item,
      size: value.size, color: value.colour, quantity: value.qty, priceAtPurchase: unitPrice,
    }],
  });
  notifyNewOrder(order); // fire-and-forget owner alert
  logOrderToSheet(order); // fire-and-forget Google Sheet log
  res.status(201).json({ ok: true, id: order.id, order });
}

// Custom print inquiry → the /admin inbox.
router.post("/custom-requests", submitLimit, async (req, res) => {
  const { ok, errors, value } = clean(
    {
      ...contactSpec,
      idea: { required: true, max: 2000 },
      referenceUrl: { max: 400, pattern: /^https?:\/\//i, patternMsg: "Links must start with http:// or https://" },
    },
    req.body
  );
  if (!ok) return res.status(400).json({ error: "Check the highlighted fields", errors });
  if (value.website) return res.status(201).json({ ok: true });

  const created = await createCustomRequest({
    name: value.name, contact: value.contact, method: value.method,
    idea: value.idea, colour: value.colour, size: value.size, qty: value.qty,
    referenceUrl: value.referenceUrl,
  });
  notifyNewCustomRequest({ id: created.id, ...value }); // fire-and-forget owner alert
  logCustomRequestToSheet({ id: created.id, ...value }); // fire-and-forget Google Sheet log
  res.status(201).json({ ok: true, id: created.id });
});

export default router;
