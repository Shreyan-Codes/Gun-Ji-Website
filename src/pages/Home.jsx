import { Link } from "react-router-dom";
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
      <section className="home-intro">
        <p className="eyebrow">
          <span className="dev">काठमाडौं</span> · Custom print studio · Nepal
        </p>
        <h1 className="home-intro-title">
          Oversized T-Shirts in Nepal,<br />
          printed in <span className="dev">काठमाडौं</span> Kathmandu
        </h1>
        <p className="home-intro-lead">
          GUN-जी makes some of the best heavyweight oversized t-shirts in Kathmandu —
          football player editions, anime back prints, <span className="dev">देसी</span>{" "}
          Devanagari type, or custom-print your own design. Designed with you, printed by
          us, and shipped across Nepal.
        </p>
        <div className="hero-ctas">
          <Link className="btn btn-solid" to="/tees">
            Shop all tees <span className="arr" aria-hidden="true">→</span>
          </Link>
          <Link className="btn btn-line-dark" to="/custom-print">
            Custom print <span className="arr" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="featured home-featured">
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

      <CtaBand
        titleDev="तपाईंको डिजाइन,"
        title="printed on a premium tee."
        to="/custom-print"
        label="Start a custom order"
      />
    </>
  );
}
