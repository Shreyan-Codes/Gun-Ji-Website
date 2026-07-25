import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHero from "../components/PageHero.jsx";
import ProductCard from "../components/ProductCard.jsx";
import ComingSoonCard from "../components/ComingSoonCard.jsx";
import CtaBand from "../components/CtaBand.jsx";
import useReveal from "../hooks/useReveal.js";
import { editionFilters } from "../data/products.jsx";
import { useSiteData } from "../context/SiteData.jsx";
import { usePageMeta } from "../lib/seo.js";
import { apiGet } from "../lib/api.js";

const SORT_OPTS = [
  { key: "", label: "Featured" },
  { key: "newest", label: "Newest" },
  { key: "price_asc", label: "Price ↑" },
  { key: "price_desc", label: "Price ↓" },
  { key: "name_asc", label: "A–Z" },
];
const SIZE_ORDER = ["S", "M", "L", "XL", "XXL"];

export default function TeesPage() {
  const [params, setParams] = useSearchParams();
  const { products: allProducts, productsRev } = useSiteData();
  usePageMeta({
    title: "Oversized T-Shirts Catalog — Buy Tees Online Nepal",
    description:
      "Shop premium oversized t-shirts printed in Kathmandu — the GUN-जी signature logo tee in white or black, plain oversized essentials, or custom-print your own design. Ships across Nepal.",
    path: "/tees",
  });

  const collection = params.get("collection") || "all";
  const sort = params.get("sort") || "";
  const size = params.get("size") || "";
  const color = params.get("color") || "";
  const inStock = params.get("inStock") === "1";

  const [results, setResults] = useState(null); // array = server list; null/undefined = use client fallback

  // Filter option lists derived from the full catalog.
  const sizes = useMemo(() => {
    const s = new Set();
    allProducts.forEach((p) => (p.variants || []).forEach((v) => s.add(v.size)));
    return SIZE_ORDER.filter((x) => s.has(x)).concat([...s].filter((x) => !SIZE_ORDER.includes(x)));
  }, [allProducts]);
  const colors = useMemo(() => {
    const c = new Set();
    allProducts.forEach((p) => (p.variants || []).forEach((v) => v.color && c.add(v.color)));
    return [...c];
  }, [allProducts]);

  // Server-side sort/filter (the source of truth). Falls back to client filtering
  // on error, or when no filters are active (then the cached catalog is fine).
  useEffect(() => {
    const qs = new URLSearchParams();
    if (collection !== "all") qs.set("collection", collection);
    if (sort) qs.set("sort", sort);
    if (size) qs.set("size", size);
    if (color) qs.set("color", color);
    if (inStock) qs.set("inStock", "1");
    if ([...qs].length === 0) {
      setResults(null);
      return;
    }
    let alive = true;
    apiGet(`/api/products?${qs.toString()}`)
      .then((d) => alive && setResults(Array.isArray(d.products) ? d.products : []))
      .catch(() => alive && setResults(undefined));
    return () => {
      alive = false;
    };
  }, [collection, sort, size, color, inStock]);

  const clientFiltered = useMemo(() => {
    let list = collection === "all" ? allProducts : allProducts.filter((p) => p.edition === collection);
    if (size) list = list.filter((p) => (p.variants || []).some((v) => v.size === size));
    if (color) list = list.filter((p) => (p.variants || []).some((v) => v.color === color));
    if (inStock) list = list.filter((p) => (p.variants || []).some((v) => v.stock > 0));
    if (sort === "price_asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === "name_asc") list = [...list].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return list;
  }, [allProducts, collection, size, color, inStock, sort]);

  const shown = Array.isArray(results) ? results : clientFiltered;
  // The coming-soon tile only belongs on the unfiltered rack — it would read as
  // a false match once someone narrows by edition, size or colour.
  const showSoon = collection === "all" && !size && !color && !inStock;
  useReveal(`${collection}:${sort}:${size}:${color}:${inStock}:${productsRev}:${shown.length}`);

  const update = (key, val) => {
    const next = new URLSearchParams(params);
    if (val) next.set(key, val);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHero
        eyebrowDev="सूची"
        eyebrow="The catalog"
        title="Tees on the rack"
        intro="Premium heavyweight cotton, printed in Kathmandu. New designs drop regularly — follow the IG to catch them first."
        meta={`${allProducts.length} designs · ships across Nepal`}
      />

      <section className="catalog">
        <div className="filter-bar reveal" role="group" aria-label="Filter tees by edition">
          {editionFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`chip ${collection === f.key ? "chip-on" : ""} ${f.dev ? "dev" : ""}`}
              aria-pressed={collection === f.key}
              onClick={() => update("collection", f.key === "all" ? "" : f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="filter-controls reveal">
          <label className="sort-field">
            <span>Sort</span>
            <select className="sort-select" value={sort} onChange={(e) => update("sort", e.target.value)}>
              {SORT_OPTS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </label>

          {sizes.length > 0 && (
            <div className="filter-group" role="group" aria-label="Filter by size">
              {sizes.map((s) => (
                <button key={s} type="button" className={`chip chip-sm ${size === s ? "chip-on" : ""}`}
                  aria-pressed={size === s} onClick={() => update("size", size === s ? "" : s)}>{s}</button>
              ))}
            </div>
          )}

          {colors.length > 0 && (
            <div className="filter-group" role="group" aria-label="Filter by colour">
              {colors.map((c) => (
                <button key={c} type="button" className={`chip chip-sm ${color === c ? "chip-on" : ""}`}
                  aria-pressed={color === c} onClick={() => update("color", color === c ? "" : c)}>{c}</button>
              ))}
            </div>
          )}

          <button type="button" className={`chip chip-sm ${inStock ? "chip-on" : ""}`}
            aria-pressed={inStock} onClick={() => update("inStock", inStock ? "" : "1")}>In stock only</button>
        </div>

        {shown.length > 0 ? (
          <div className="product-grid">
            {shown.map((product) => (
              <ProductCard product={product} key={product.slug || product.orderItem} />
            ))}
            {showSoon && <ComingSoonCard />}
          </div>
        ) : (
          <p className="empty-note">Nothing matches those filters — try clearing a few.</p>
        )}
      </section>

      <CtaBand
        titleDev="कस्टम"
        title="— can't find it? We'll print it."
        to="/custom-print"
        label="Start a custom order"
      />
    </>
  );
}
