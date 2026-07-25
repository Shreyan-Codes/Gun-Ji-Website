import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api.js";
import {
  products as staticProducts,
  WHATSAPP_NUMBER,
  IG_DM,
  IG_PROFILE,
} from "../data/products.jsx";
import { DEFAULT_COMING_SOON_IMAGE, DEFAULT_HOME_GALLERY } from "../data/homeGallery.js";

// Site data (catalog + contact settings) comes from the backend so the owner
// can edit tees, prices and the WhatsApp number in /admin without a deploy.
// The static arrays in src/data stay as an offline fallback: if the API is
// unreachable the site still renders the launch catalog.

const DEV_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
const toDevNum = (n) =>
  String(n).padStart(2, "0").split("").map((d) => DEV_DIGITS[Number(d)]).join("");

const formatPrice = (price, priceFrom) =>
  `${priceFrom ? "from " : ""}Rs. ${Number(price).toLocaleString("en-IN")}`;

const priceOnly = (n) => `Rs. ${Number(n).toLocaleString("en-IN")}`;
// Discount % off the compare-at ("was") price — null when there's no valid sale.
const discountPct = (price, was) =>
  was && was > price ? Math.round((1 - price / was) * 100) : null;

// The static fallback carries prices as display strings ("from Rs. 1,299");
// pull the number back out so the order page can compute live totals.
const parseStaticPrice = (str) => ({
  priceValue: Number(String(str).replace(/[^\d]/g, "")) || 0,
  priceFrom: /^\s*from/i.test(str),
});
const normalizeStatic = (list) =>
  list.map((p) => {
    const { priceValue, priceFrom } = parseStaticPrice(p.price);
    const compareAtValue = p.priceWas ? Number(String(p.priceWas).replace(/[^\d]/g, "")) || null : null;
    return {
      ...p,
      priceValue,
      priceFrom,
      compareAt: compareAtValue ? priceOnly(compareAtValue) : null,
      compareAtValue,
      discountPct: discountPct(priceValue, compareAtValue),
    };
  });

// Plate numbers (PL·०१) follow catalog position, so they stay sequential
// even after products are added/removed in admin.
const withPlates = (list) => list.map((p, i) => ({ ...p, num: toDevNum(i + 1) }));

const fallbackSettings = {
  whatsappNumber: WHATSAPP_NUMBER,
  igDm: IG_DM,
  igProfile: IG_PROFILE,
  homeGallery: DEFAULT_HOME_GALLERY,
  comingSoonImage: DEFAULT_COMING_SOON_IMAGE,
};

const SiteDataContext = createContext({
  products: withPlates(normalizeStatic(staticProducts)),
  settings: fallbackSettings,
  productsRev: 0,
  orderLink: () => IG_DM,
});

export function SiteDataProvider({ children }) {
  const [products, setProducts] = useState(() => withPlates(normalizeStatic(staticProducts)));
  const [settings, setSettings] = useState(fallbackSettings);
  // Bumps when API data lands — pages feed it to useReveal so freshly
  // swapped-in cards get picked up by the IntersectionObserver.
  const [productsRev, setProductsRev] = useState(0);

  useEffect(() => {
    let alive = true;

    apiGet("/api/products")
      .then(({ products: rows }) => {
        if (!alive || !Array.isArray(rows) || rows.length === 0) return;
        setProducts(
          withPlates(
            rows.map((r) => ({
              id: r.id,
              name: r.name,
              slug: r.slug,
              tag: r.tag,
              price: formatPrice(r.price, r.priceFrom),
              priceValue: r.price,
              priceFrom: r.priceFrom,
              compareAt: r.compareAt ? priceOnly(r.compareAt) : null,
              compareAtValue: r.compareAt ?? null,
              discountPct: discountPct(r.price, r.compareAt),
              img: r.img,
              alt: r.alt,
              orderItem: r.orderItem,
              edition: r.edition,
              inStock: r.inStock,
            }))
          )
        );
        setProductsRev((rev) => rev + 1);
      })
      .catch(() => {}); // fallback catalog already rendered

    apiGet("/api/settings")
      .then((s) => {
        if (alive && s && typeof s === "object") {
          setSettings({
            whatsappNumber: s.whatsappNumber || "",
            igDm: s.igDm || IG_DM,
            igProfile: s.igProfile || IG_PROFILE,
            homeGallery: Array.isArray(s.homeGallery) && s.homeGallery.length ? s.homeGallery : DEFAULT_HOME_GALLERY,
            comingSoonImage: s.comingSoonImage || DEFAULT_COMING_SOON_IMAGE,
          });
        }
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  const orderLink = useCallback(
    (item) => {
      if (settings.whatsappNumber) {
        const msg = item
          ? `Hi GUN-जी! I'd like to order: ${item}`
          : "Hi GUN-जी! I'd like to place an order.";
        return `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(msg)}`;
      }
      return settings.igDm;
    },
    [settings]
  );

  const value = useMemo(
    () => ({ products, settings, productsRev, orderLink }),
    [products, settings, productsRev, orderLink]
  );

  return <SiteDataContext.Provider value={value}>{children}</SiteDataContext.Provider>;
}

export const useSiteData = () => useContext(SiteDataContext);
