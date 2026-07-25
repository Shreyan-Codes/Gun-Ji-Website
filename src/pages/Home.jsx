import { useRef } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import ComingSoonCard from "../components/ComingSoonCard.jsx";
import CtaBand from "../components/CtaBand.jsx";
import useReveal from "../hooks/useReveal.js";
import { useSiteData } from "../context/SiteData.jsx";
import { usePageMeta } from "../lib/seo.js";
import { DEFAULT_HOME_GALLERY } from "../data/homeGallery.js";

export default function Home() {
  const { products, productsRev, settings } = useSiteData();
  const dragRef = useRef(null);
  const gallery = settings.homeGallery?.length ? settings.homeGallery : DEFAULT_HOME_GALLERY;
  usePageMeta({ path: "/" }); // homepage keeps the full default title/description
  // Re-observe reveal targets if the API swaps the catalog in after mount.
  useReveal(`home:${productsRev}`);
  // The launch catalog is small enough to show in full on the homepage.
  const featured = products.slice(0, 6);

  const startDrag = (event) => {
    if (event.pointerType !== "mouse") return;
    dragRef.current = { x: event.clientX, scrollLeft: event.currentTarget.scrollLeft };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add("is-dragging");
  };

  const dragGallery = (event) => {
    if (!dragRef.current) return;
    event.currentTarget.scrollLeft = dragRef.current.scrollLeft - (event.clientX - dragRef.current.x);
  };

  const endDrag = (event) => {
    dragRef.current = null;
    event.currentTarget.classList.remove("is-dragging");
  };

  return (
    <>
      <section className="home-intro">
        <div className="home-intro-inner">
          <div className="home-intro-copy">
            <p className="eyebrow">
              <span className="dev">नेपाल</span> · Premium tees · Nationwide delivery
            </p>
            <h1 className="home-intro-title">
              Premium T-Shirts in Nepal,<br />
              at our most affordable price
            </h1>
            <p className="home-intro-lead">
              Premium normal-fit t-shirts in white or black, plus custom prints made
              from your own design. Designed with you, printed by us, and delivered
              all across Nepal.
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

          <div className="home-intro-art clip-reveal">
            <div
              className="home-gallery"
              role="region"
              aria-roledescription="carousel"
              aria-label="GUN-जी studio gallery"
              aria-description="Swipe or drag horizontally to see all photos"
              tabIndex="0"
              onPointerDown={startDrag}
              onPointerMove={dragGallery}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              {gallery.map((shot, i) => (
                <figure
                  className="home-gallery-slide"
                  key={`${shot.src}-${i}`}
                  aria-label={`${i + 1} of ${gallery.length}`}
                >
                  <img
                    src={shot.src}
                    alt={shot.alt}
                    width="1200"
                    height="1600"
                    fetchpriority={i === 0 ? "high" : undefined}
                    loading={i === 0 ? "eager" : "lazy"}
                    draggable="false"
                  />
                  <figcaption>
                    <span>{shot.cap}</span>
                    <span>{String(i + 1).padStart(2, "0")} / {String(gallery.length).padStart(2, "0")}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
            <div className="home-gallery-controls">
              <span className="home-gallery-hint">Swipe / drag</span>
            </div>
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

      <CtaBand
        titleDev="तपाईंको डिजाइन,"
        title="printed on a premium tee."
        to="/custom-print"
        label="Start a custom order"
      />
    </>
  );
}
