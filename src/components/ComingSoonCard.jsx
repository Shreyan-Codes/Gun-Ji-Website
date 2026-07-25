import { useSiteData } from "../context/SiteData.jsx";

// Placeholder tile that sits as the last card in a product grid while the
// catalog is still small. The artwork is pre-blurred at build time
// (public/assets/gunji_coming_soon.jpg) so it reads as "more is on the way"
// without shipping a sharp photo of a product nobody can buy yet.
export default function ComingSoonCard() {
  const { settings } = useSiteData();

  return (
    <article className="product product-soon reveal">
      <div className="product-img product-soon-img">
        <img src="/assets/gunji_coming_soon.jpg" alt="" aria-hidden="true" loading="lazy" />
        <div className="product-soon-plate">
          <span className="product-soon-eyebrow dev">छिट्टै</span>
          <span className="product-soon-title">Coming soon</span>
          <span className="product-soon-sub">More drops in the works</span>
        </div>
      </div>
      <div className="product-meta">
        <h3>More drops</h3>
        <p className="product-tag">
          Player editions · Anime back prints · <span className="dev">देसी</span> type
        </p>
        <div className="product-row">
          <span className="price price-soon">—</span>
          <a
            className="mono-link"
            href={settings.igProfile}
            target="_blank"
            rel="noopener noreferrer"
          >
            Follow for drops ↗
          </a>
        </div>
      </div>
    </article>
  );
}
