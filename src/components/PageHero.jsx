// Identity band that opens every subpage.
export default function PageHero({ eyebrowDev, eyebrow, title, intro, meta }) {
  return (
    <section className="page-hero">
      <div className="page-hero-inner">
        <p className="eyebrow fi" style={{ "--d": "0.05s" }}>
          <span className="dev">{eyebrowDev}</span> · {eyebrow}
        </p>
        <h1 className="rise-mask">
          <span className="page-hero-title rise">{title}</span>
        </h1>
        {intro && (
          <p className="page-hero-intro fi" style={{ "--d": "0.45s" }}>
            {intro}
          </p>
        )}
        {meta && (
          <p className="page-hero-meta fi" style={{ "--d": "0.6s" }}>
            {meta}
          </p>
        )}
      </div>
    </section>
  );
}
