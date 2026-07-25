import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import ComingSoonCard from "../components/ComingSoonCard.jsx";
import CtaBand from "../components/CtaBand.jsx";
import useReveal from "../hooks/useReveal.js";
import { useSiteData } from "../context/SiteData.jsx";
import { usePageMeta } from "../lib/seo.js";

// Studio shots of the signature tee. The lede uses the first two; the rest
// run in the lookbook strip below the grid.
const LEDE_SHOTS = [
  {
    src: "/assets/gunji_tee_white_front.jpg",
    alt: "GUN-जी logo t-shirt in white, laid flat",
    cap: "Signature — white",
  },
  {
    src: "/assets/gunji_tee_black_front.jpg",
    alt: "GUN-जी logo t-shirt in black, laid flat",
    cap: "Signature — black",
  },
];

const LOOKBOOK = [
  {
    src: "/assets/gunji_duo_wide.jpg",
    alt: "GUN-जी logo tees in white and black, laid side by side",
    cap: "Both colourways",
    num: "०१",
  },
  {
    src: "/assets/gunji_duo_stack.jpg",
    alt: "White and black GUN-जी logo tees layered over each other",
    cap: "Heavyweight cotton",
    num: "०२",
  },
  {
    src: "/assets/gunji_duo_detail.jpg",
    alt: "Close-up of the GUN-जी chest print on the white and black tees",
    cap: "Chest print detail",
    num: "०३",
  },
  {
    src: "/assets/gunji_duo_street.jpg",
    alt: "GUN-जी logo tees laid out on turf, shot from above",
    cap: "Shot in Kathmandu",
    num: "०४",
  },
];

export default function Home() {
  const { products, productsRev } = useSiteData();
  usePageMeta({ path: "/" }); // homepage keeps the full default title/description
  // Re-observe reveal targets if the API swaps the catalog in after mount.
  useReveal(`home:${productsRev}`);
  // The launch catalog is small enough to show in full on the homepage.
  const featured = products.slice(0, 6);

  return (
    <>
      <section className="home-intro">
        <div className="home-intro-inner">
          <div className="home-intro-copy">
            <p className="eyebrow">
              <span className="dev">काठमाडौं</span> · Custom print studio · Nepal
            </p>
            <h1 className="home-intro-title">
              Oversized T-Shirts in Nepal,<br />
              printed in <span className="dev">काठमाडौं</span> Kathmandu
            </h1>
            <p className="home-intro-lead">
              GUN-जी makes some of the best heavyweight t-shirts in Kathmandu —
              the signature logo tee in white or black, plain cotton essentials, or
              custom-print your own design. Designed with you, printed by us, and shipped
              across Nepal.
            </p>
            <div className="hero-ctas">
              <Link className="btn btn-solid" to="/tees">
                Shop all tees <span className="arr" aria-hidden="true">→</span>
              </Link>
              <Link className="btn btn-line-dark" to="/custom-print">
                Custom print <span className="arr" aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          <div className="home-intro-art">
            {LEDE_SHOTS.map((shot, i) => (
              <figure className={`lede-shot lede-shot-${i + 1} clip-reveal`} key={shot.src}>
                <img
                  src={shot.src}
                  alt={shot.alt}
                  width="1200"
                  height="1600"
                  fetchpriority={i === 0 ? "high" : undefined}
                />
                <figcaption>{shot.cap}</figcaption>
              </figure>
            ))}
          </div>
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
            <ProductCard product={product} key={product.slug || product.orderItem} />
          ))}
          <ComingSoonCard />
        </div>
      </section>

      <section className="lookbook">
        <div className="sect-head sect-head-row reveal">
          <div>
            <p className="eyebrow">
              <span className="dev">झलक</span> · The lookbook
            </p>
            <h2>Shot in the studio</h2>
          </div>
        </div>
        <div className="lookbook-strip">
          {LOOKBOOK.map((shot) => (
            <figure className="lookbook-shot reveal" key={shot.src}>
              <img src={shot.src} alt={shot.alt} loading="lazy" />
              <figcaption>
                <span>{shot.cap}</span>
                <span className="dev" aria-hidden="true">{shot.num}</span>
              </figcaption>
            </figure>
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
