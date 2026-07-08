import { useState } from "react";
import PageHero from "../components/PageHero.jsx";
import ProductCard from "../components/ProductCard.jsx";
import CtaBand from "../components/CtaBand.jsx";
import useReveal from "../hooks/useReveal.js";
import { editionFilters } from "../data/products.jsx";
import { useSiteData } from "../context/SiteData.jsx";

export default function TeesPage() {
  const [filter, setFilter] = useState("all");
  const { products, productsRev } = useSiteData();
  useReveal(`${filter}:${productsRev}`);
  const shown = filter === "all" ? products : products.filter((p) => p.edition === filter);

  return (
    <>
      <PageHero
        eyebrowDev="सूची"
        eyebrow="The catalog"
        title="Tees on the rack"
        intro="All tees are premium oversized fit. Prices are launch placeholders — DM for the real tag."
        meta={`${products.length} designs · ships across Nepal`}
      />

      <section className="catalog">
        <div className="filter-bar reveal" role="group" aria-label="Filter tees by edition">
          {editionFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`chip ${filter === f.key ? "chip-on" : ""} ${f.dev ? "dev" : ""}`}
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {shown.length > 0 ? (
          <div className="product-grid">
            {shown.map((product) => (
              <ProductCard product={product} key={product.orderItem} />
            ))}
          </div>
        ) : (
          <p className="empty-note">No tees in this edition yet — check back after the next drop.</p>
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
