import { Link } from "react-router-dom";
import Hero from "../components/Hero.jsx";
import Ticker from "../components/Ticker.jsx";
import Editions from "../components/Editions.jsx";
import Brand from "../components/Brand.jsx";
import ProductCard from "../components/ProductCard.jsx";
import CtaBand from "../components/CtaBand.jsx";
import useReveal from "../hooks/useReveal.js";
import { useSiteData } from "../context/SiteData.jsx";
import { usePageMeta } from "../lib/seo.js";

export default function Home() {
  const { products, productsRev } = useSiteData();
  usePageMeta({ path: "/" }); // homepage keeps the full default title/description
  // Re-observe reveal targets if the API swaps the catalog in after mount.
  useReveal(`home:${productsRev}`);
  const featured = products.slice(0, 3);

  return (
    <>
      <Hero />
      <Ticker />

      <Editions />

      <section className="featured">
        <div className="sect-head sect-head-row reveal">
          <div>
            <p className="eyebrow">
              <span className="dev">ताजा</span> · The rack
            </p>
            <h2>Fresh off the press</h2>
          </div>
          <Link className="btn btn-line-dark" to="/tees">
            All tees <span className="arr" aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="product-grid">
          {featured.map((product) => (
            <ProductCard product={product} key={product.orderItem} />
          ))}
        </div>
      </section>

      <Brand />

      <CtaBand
        titleDev="तपाईंको डिजाइन,"
        title="printed on a premium tee."
        to="/custom-print"
        label="Start a custom order"
      />
    </>
  );
}
