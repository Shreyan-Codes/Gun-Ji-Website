import { Link } from "react-router-dom";

// Full-bleed crimson closing band, shared across pages.
// `to` renders a router link; `href` renders an external link.
export default function CtaBand({ titleDev, title, to, href, label }) {
  const inner = (
    <>
      {label} <span className="arr" aria-hidden="true">→</span>
    </>
  );

  return (
    <section className="cta-band">
      <div className="cta-band-inner reveal">
        <span className="cta-band-star" aria-hidden="true">✦</span>
        <h2 className="cta-band-title">
          {titleDev && <span className="dev cta-band-dev">{titleDev}</span>}
          {title}
        </h2>
        {to ? (
          <Link className="btn btn-band" to={to}>{inner}</Link>
        ) : (
          <a className="btn btn-band" href={href} target="_blank" rel="noopener noreferrer">{inner}</a>
        )}
      </div>
    </section>
  );
}
