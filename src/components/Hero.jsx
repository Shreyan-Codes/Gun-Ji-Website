import { Link } from "react-router-dom";
import { useSiteData } from "../context/SiteData.jsx";

export default function Hero() {
  const { orderLink, settings } = useSiteData();

  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-topline fi" style={{ "--d": "0.05s" }}>
          <span>Custom print studio — <span className="dev">काठमाडौं</span></span>
          <a className="mono-link" href={settings.igProfile} target="_blank" rel="noopener noreferrer">
            @gunji.clo1 ↗
          </a>
        </div>

        <div className="hero-main">
          <div className="hero-left">
            <h1 className="hero-word-mask" aria-label="GUN-JI">
              <span className="hero-word rise">
                GUN<span className="hero-dash">—</span><span className="dev hero-dev">जी</span>
              </span>
            </h1>
            <p className="hero-copy fi" style={{ "--d": "0.5s" }}>
              Heavyweight tees printed in Kathmandu — the signature{" "}
              <span className="dev">जी</span> logo tee, plain essentials, or whatever's
              living in your head, printed to order.
            </p>
            <div className="hero-ctas fi" style={{ "--d": "0.65s" }}>
              <Link className="btn btn-solid" to="/tees">
                Browse the rack <span className="arr" aria-hidden="true">→</span>
              </Link>
              <a className="btn btn-line" href={orderLink()} target="_blank" rel="noopener noreferrer">
                DM to order <span className="arr" aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <div className="hero-photo">
            <figure className="hero-arch clip-reveal">
              <img
                src="/assets/gunji_tee_white_front.jpg"
                alt="GUN-जी logo t-shirt in white, laid flat"
                width="1200"
                height="1600"
                fetchpriority="high"
              />
            </figure>
            <div className="hero-cap fi" style={{ "--d": "0.9s" }}>
              <span>Shot — KTM studio</span>
              <span className="dev">००१</span>
            </div>
          </div>
        </div>

        <div className="hero-rail fi" style={{ "--d": "0.85s" }}>
          <span>Designed by you <span className="star" aria-hidden="true">✦</span> printed by us</span>
          <span>KTM · Nepal · 1,400 m</span>
        </div>
      </div>
    </section>
  );
}
