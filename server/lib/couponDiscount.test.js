import test from "node:test";
import assert from "node:assert/strict";
import { calculateCouponDiscount, couponDiscountBase } from "./couponDiscount.js";

const cart = [
  { priceAtPurchase: 1200, quantity: 1 },
  { priceAtPurchase: 800, quantity: 2 },
];

test("an unlimited percentage coupon discounts the full subtotal", () => {
  const coupon = { discount_type: "percent", discount_value: 15, max_discount_items: null };
  assert.equal(calculateCouponDiscount(coupon, 2800, cart), 420);
});

test("an item-limited coupon uses the highest-priced eligible tee", () => {
  const coupon = { discount_type: "percent", discount_value: 15, max_discount_items: 1 };
  assert.equal(couponDiscountBase(coupon, 2800, cart), 1200);
  assert.equal(calculateCouponDiscount(coupon, 2800, cart), 180);
});

test("multiple quantities of one line still count as separate tees", () => {
  const coupon = { discount_type: "percent", discount_value: 10, max_discount_items: 1 };
  assert.equal(calculateCouponDiscount(coupon, 1600, [{ priceAtPurchase: 800, quantity: 2 }]), 80);
});

test("a fixed discount cannot exceed the eligible tee price", () => {
  const coupon = { discount_type: "fixed", discount_value: 2000, max_discount_items: 1 };
  assert.equal(calculateCouponDiscount(coupon, 2800, cart), 1200);
});
