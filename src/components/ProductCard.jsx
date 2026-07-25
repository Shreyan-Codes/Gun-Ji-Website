import { useState } from "react";
import { Link } from "react-router-dom";
import Dev from "../lib/Dev.jsx";
import QuickView from "./QuickView.jsx";

export default function ProductCard({ product }) {
  const [qvOpen, setQvOpen] = useState(false);
  // Link to the product page (variant picker + add to cart). Falls back to the
  // numeric id when a slug isn't available (static/offline catalog).
  const to = `/product/${product.slug ?? product.id}`;

  // Product-level stock badge. Empty variants (static fallback) → no badge.
  const statuses = (product.variants ?? []).map(
    (v) => v.stockStatus ?? (v.stock > 0 ? "in_stock" : "out_of_stock")
  );
  const badge = product.edition === "custom"
    ? "Made to order"
    : statuses.length === 0 || statuses.includes("in_stock")
      ? null
      : statuses.includes("pre_order")
        ? "Pre-order"
        : "Sold out";

  return (
    <>
    <article className="product reveal">
      <Link className="product-img" to={to} aria-label={typeof product.name === "string" ? product.name : "View tee"}>
        <img src={product.img} alt={product.alt} loading="lazy" />
        <span className="plate">
          PL·<span className="dev">{product.num}</span>
        </span>
        {badge && <span className={`product-badge ${badge === "Sold out" ? "is-out" : "is-pre"}`}>{badge}</span>}
        <span className="stamp dev" aria-hidden="true">जी</span>
      </Link>
      <div className="product-meta">
        <h3><Link className="product-name-link" to={to}><Dev text={product.name} /></Link></h3>
        <p className="product-tag"><Dev text={product.tag} /></p>
        <div className="product-row">
          <span className="price">
            <span className="price-now">{product.price}</span>
            {product.compareAt && (
              // Grouped so the struck price and the % badge always wrap together
              // onto the same line in the narrow 2-up phone grid.
              <span className="price-cut">
                <span className="price-was">{product.compareAt}</span>
                {product.discountPct ? <span className="price-off">-{product.discountPct}%</span> : null}
              </span>
            )}
          </span>
          <button type="button" className="mono-link qv-open" onClick={() => setQvOpen(true)}>
            Quick view
          </button>
        </div>
      </div>
    </article>
    {qvOpen && <QuickView product={product} onClose={() => setQvOpen(false)} />}
    </>
  );
}
