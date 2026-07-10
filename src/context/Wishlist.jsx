import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { apiPost, apiDelete } from "../lib/api.js";
import { useAuth } from "./Auth.jsx";

// Wishlist of saved variants. Guests persist to localStorage; on login the guest
// list is merged into the account and replaced by the server copy. Each entry
// stores enough to render without a re-fetch (same idea as the cart).

const KEY = "gunji_wishlist";
const WishlistContext = createContext(null);

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }) {
  const { customer, getToken } = useAuth();
  const [items, setItems] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable */
    }
  }, [items]);

  // On login: merge the guest list into the account, then adopt the server copy.
  const synced = useRef(false);
  useEffect(() => {
    const token = getToken();
    if (customer && token && !synced.current) {
      synced.current = true;
      const ids = load().map((i) => i.variantId);
      apiPost("/api/wishlist/merge", { variantIds: ids }, { token })
        .then((d) => setItems(d.items || []))
        .catch(() => {});
    } else if (!customer) {
      synced.current = false;
    }
  }, [customer, getToken]);

  const has = useCallback((variantId) => items.some((i) => i.variantId === variantId), [items]);

  // item: { variantId, slug, name, img, price, priceFrom, size, color }
  const add = useCallback(
    (item) => {
      setItems((prev) => (prev.some((i) => i.variantId === item.variantId) ? prev : [item, ...prev]));
      const token = getToken();
      if (customer && token) apiPost("/api/wishlist", { variantId: item.variantId }, { token }).catch(() => {});
    },
    [customer, getToken]
  );

  const remove = useCallback(
    (variantId) => {
      setItems((prev) => prev.filter((i) => i.variantId !== variantId));
      const token = getToken();
      if (customer && token) apiDelete(`/api/wishlist/${variantId}`, { token }).catch(() => {});
    },
    [customer, getToken]
  );

  const toggle = useCallback(
    (item) => (has(item.variantId) ? remove(item.variantId) : add(item)),
    [has, add, remove]
  );

  const value = useMemo(
    () => ({ items, count: items.length, has, add, remove, toggle }),
    [items, has, add, remove, toggle]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => useContext(WishlistContext);
