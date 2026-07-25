import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { T_SHIRT_SIZES } from "../data/sizeGuide.js";

// Client-side cart (persisted to localStorage). Lines are keyed by variantId;
// each stores enough to render without re-fetching. Prices here are for display
// only — the server re-snapshots the real price + checks stock at checkout.

const CartContext = createContext(null);
const KEY = "gunji_cart";
const ALLOWED_SIZES = new Set(T_SHIRT_SIZES);

function numericPrice(value) {
  const direct = Number(value);
  if (Number.isFinite(direct)) return direct;
  return Number(String(value ?? "").replace(/[^\d.]/g, "")) || 0;
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(raw)
      ? raw
          .filter((item) => ALLOWED_SIZES.has(item?.size))
          .map((item) => ({ ...item, price: numericPrice(item.price) }))
      : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      // storage full / unavailable — cart just won't persist
    }
  }, [items]);

  // line: { variantId, productId, slug, name, img, size, color, price, maxStock }
  const add = useCallback((line, qty = 1) => {
    if (!ALLOWED_SIZES.has(line?.size)) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === line.variantId);
      const cap = line.maxStock ?? 99;
      if (existing) {
        return prev.map((i) =>
          i.variantId === line.variantId ? { ...i, qty: Math.min(cap, i.qty + qty), maxStock: cap } : i
        );
      }
      return [...prev, { ...line, qty: Math.min(cap, Math.max(1, qty)) }];
    });
  }, []);

  const setQty = useCallback((variantId, qty) => {
    setItems((prev) =>
      prev
        .map((i) => (i.variantId === variantId ? { ...i, qty: Math.max(0, Math.min(i.maxStock ?? 99, qty)) } : i))
        .filter((i) => i.qty > 0)
    );
  }, []);

  const remove = useCallback((variantId) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const count = items.reduce((n, i) => n + i.qty, 0);
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    return { items, add, setQty, remove, clear, count, subtotal };
  }, [items, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
