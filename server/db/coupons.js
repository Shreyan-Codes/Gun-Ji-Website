import { db } from "./index.js";

const CODE_RE = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

export class CouponError extends Error {
  constructor(message, code = "COUPON_INVALID") {
    super(message);
    this.name = "CouponError";
    this.code = code;
  }
}

export function normalizeCouponCode(value) {
  return String(value || "").trim().toUpperCase();
}

export function calculateCouponDiscount(coupon, subtotal) {
  const amount = Math.max(0, Math.trunc(Number(subtotal) || 0));
  const raw = coupon.discount_type === "percent"
    ? Math.floor(amount * coupon.discount_value / 100)
    : coupon.discount_value;
  return Math.min(amount, Math.max(0, raw));
}

function couponToJson(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    minOrderAmount: row.min_order_amount,
    maxUses: row.max_uses,
    usesCount: row.uses_count,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    active: !!row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertUsable(row, subtotal) {
  if (!row || !row.active) {
    throw new CouponError("That coupon code is not valid.");
  }
  const now = Date.now();
  if (row.valid_from && new Date(row.valid_from).getTime() > now) {
    throw new CouponError("That coupon is not active yet.");
  }
  if (row.valid_until && new Date(row.valid_until).getTime() <= now) {
    throw new CouponError("That coupon has expired.");
  }
  if (row.max_uses !== null && row.uses_count >= row.max_uses) {
    throw new CouponError("That coupon has reached its usage limit.");
  }
  if (subtotal < row.min_order_amount) {
    throw new CouponError(
      `Spend at least Rs. ${Number(row.min_order_amount).toLocaleString("en-IN")} to use this coupon.`,
      "COUPON_MINIMUM"
    );
  }
}

async function getUsableCoupon(code, subtotal, { lock = false } = {}) {
  const normalized = normalizeCouponCode(code);
  if (!CODE_RE.test(normalized)) {
    throw new CouponError("That coupon code is not valid.");
  }
  const row = await db.prepare(
    `SELECT * FROM coupons WHERE code = ?${lock ? " FOR UPDATE" : ""}`
  ).get(normalized);
  assertUsable(row, subtotal);
  return row;
}

export async function quoteCoupon(code, subtotal) {
  const row = await getUsableCoupon(code, subtotal);
  const discount = calculateCouponDiscount(row, subtotal);
  return {
    coupon: couponToJson(row),
    subtotal,
    discount,
    total: subtotal - discount,
  };
}

// Must be called inside the order transaction. SELECT ... FOR UPDATE makes the
// max-uses check and increment atomic even when checkouts arrive together.
export async function redeemCoupon(code, subtotal) {
  if (!normalizeCouponCode(code)) return null;
  const row = await getUsableCoupon(code, subtotal, { lock: true });
  const discount = calculateCouponDiscount(row, subtotal);
  await db.prepare(
    "UPDATE coupons SET uses_count = uses_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(row.id);
  return { id: row.id, code: row.code, discount };
}

export async function listCoupons() {
  const rows = await db.prepare("SELECT * FROM coupons ORDER BY id DESC").all();
  return rows.map(couponToJson);
}

export async function createCoupon(input) {
  const code = normalizeCouponCode(input.code);
  if (!CODE_RE.test(code)) throw new CouponError("Use 3–32 letters, numbers, hyphens or underscores.");
  const info = await db.prepare(
    `INSERT INTO coupons
      (code, description, discount_type, discount_value, min_order_amount, max_uses, valid_from, valid_until, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    code, input.description, input.discountType, input.discountValue,
    input.minOrderAmount, input.maxUses, input.validFrom, input.validUntil,
    input.active ? 1 : 0
  );
  return couponToJson(await db.prepare("SELECT * FROM coupons WHERE id = ?").get(info.lastInsertRowid));
}

const COUPON_COL = {
  code: "code",
  description: "description",
  discountType: "discount_type",
  discountValue: "discount_value",
  minOrderAmount: "min_order_amount",
  maxUses: "max_uses",
  validFrom: "valid_from",
  validUntil: "valid_until",
  active: "active",
};

export async function updateCoupon(id, patch) {
  const sets = [];
  const params = [];
  for (const [key, col] of Object.entries(COUPON_COL)) {
    if (!Object.hasOwn(patch, key)) continue;
    let value = patch[key];
    if (key === "code") {
      value = normalizeCouponCode(value);
      if (!CODE_RE.test(value)) throw new CouponError("Use 3–32 letters, numbers, hyphens or underscores.");
    }
    if (key === "active") value = value ? 1 : 0;
    sets.push(`${col} = ?`);
    params.push(value);
  }
  if (!sets.length) return couponToJson(await db.prepare("SELECT * FROM coupons WHERE id = ?").get(id));
  const info = await db.prepare(
    `UPDATE coupons SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(...params, id);
  if (!info.changes) return null;
  return couponToJson(await db.prepare("SELECT * FROM coupons WHERE id = ?").get(id));
}

export async function deleteCoupon(id) {
  const info = await db.prepare("DELETE FROM coupons WHERE id = ?").run(id);
  return info.changes > 0;
}
