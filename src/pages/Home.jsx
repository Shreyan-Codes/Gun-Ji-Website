import { useRef, useState } from "react";
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
  const galleryRef = useRef(null);
  const dragRef = useRef(null);
  const scrollFrame = useRef(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const gallery = settings.homeGallery?.length ? settings.homeGallery : DEFAULT_HOME_GALLERY;
  usePageMeta({ path: "/" }); // homepage keeps the full default title/description
  // Re-observe reveal targets if the API swaps the catalog in after mount.
  useReveal(`home:${productsRev}`);
  // The launch catalog is small enough to show in full on the homepage.
  const featured = products.slice(0, 6);

  const goToSlide = (index) => {
    const track = galleryRef.current;
    const slides = track?.querySelectorAll(".home-gallery-slide");
    if (!track || !slides?.length) return;
    const next = Math.max(0, Math.min(index, slides.length - 1));
    track.scrollTo({ left: slides[next].offsetLeft - track.offsetLeft, behavior: "smooth" });
    setActiveSlide(next);
  };

  const updateActiveSlide = () => {
    cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = requestAnimationFrame(() => {
      const track = galleryRef.current;
      const slides = [...(track?.querySelectorAll(".home-gallery-slide") || [])];
      if (!track || !slides.length) return;
      const nearest = slides.reduce(
        (best, slide, index) => {
          const distance = Math.abs((slide.offsetLeft - track.offsetLeft) - track.scrollLeft);
          return distance < best.distance ? { index, distance } : best;
        },
        { index: 0, distance: Infinity }
      );
      setActiveSlide(nearest.index);
    });
  };

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
              ref={galleryRef}
              role="region"
              aria-roledescription="carousel"
              aria-label="GUN-जी studio gallery"
              tabIndex="0"
              onScroll={updateActiveSlide}
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
              <div className="home-gallery-dots" aria-label="Choose gallery photo">
                {gallery.map((shot, i) => (
                  <button
                    type="button"
                    className={i === activeSlide ? "on" : ""}
                    aria-label={`Show photo ${i + 1}`}
                    aria-current={i === activeSlide ? "true" : undefined}
                    onClick={() => goToSlide(i)}
                    key={`${shot.src}-dot-${i}`}
                  />
                ))}
              </div>
              <div className="home-gallery-arrows">
                <button type="button" onClick={() => goToSlide(activeSlide - 1)} disabled={activeSlide === 0} aria-label="Previous photo">←</button>
                <button type="button" onClick={() => goToSlide(activeSlide + 1)} disabled={activeSlide === gallery.length - 1} aria-label="Next photo">→</button>
              </div>
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
