import { useSiteData } from "../context/SiteData.jsx";
import { DEFAULT_COMING_SOON_IMAGE } from "../data/homeGallery.js";

// Preview tile for the next studio drop.
export default function ComingSoonCard() {
  const { settings } = useSiteData();

  return (
    <article className="product product-soon reveal">
      <div className="product-img product-soon-img">
        <img src={settings.comingSoonImage || DEFAULT_COMING_SOON_IMAGE} alt="" aria-hidden="true" loading="lazy" />
        <div className="product-soon-plate">
          <span className="product-soon-eyebrow dev">छिट्टै</span>
          <span className="product-soon-title">Crop T-Shirt</span>
          <span className="product-soon-sub">Soon in studio</span>
        </div>
      </div>
      <div className="product-meta">
        <h3>Crop T-Shirt</h3>
        <p className="product-tag">
          Coming soon · Sizes S · M · L
        </p>
        <div className="product-row">
          <span className="price price-soon">—</span>
          <a
            className="mono-link"
            href={settings.igProfile}
            target="_blank"
            rel="noopener noreferrer"
          >
            Follow for launch ↗
          </a>
        </div>
      </div>
    </article>
  );
}
