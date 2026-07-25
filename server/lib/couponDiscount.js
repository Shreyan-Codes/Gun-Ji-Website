function wholeNonNegative(value) {
  return Math.max(0, Math.trunc(Number(value) || 0));
}

export function couponDiscountBase(coupon, subtotal, items = []) {
  const amount = wholeNonNegative(subtotal);
  const itemLimit = Number(coupon?.max_discount_items);
  if (!Number.isInteger(itemLimit) || itemLimit < 1) return amount;

  const pricedLines = items
    .map((item) => ({
      price: wholeNonNegative(item?.priceAtPurchase),
      quantity: wholeNonNegative(item?.quantity),
    }))
    .filter((item) => item.price > 0 && item.quantity > 0)
    .sort((a, b) => b.price - a.price);

  let remaining = itemLimit;
  let discountBase = 0;
  for (const item of pricedLines) {
    if (remaining === 0) break;
    const eligibleQuantity = Math.min(remaining, item.quantity);
    discountBase += item.price * eligibleQuantity;
    remaining -= eligibleQuantity;
  }

  return Math.min(amount, discountBase);
}

export function calculateCouponDiscount(coupon, subtotal, items = []) {
  const amount = couponDiscountBase(coupon, subtotal, items);
  const discountValue = wholeNonNegative(coupon?.discount_value);
  const raw = coupon?.discount_type === "percent"
    ? Math.floor(amount * discountValue / 100)
    : discountValue;
  return Math.min(amount, Math.max(0, raw));
}
