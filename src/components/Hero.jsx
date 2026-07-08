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
              Heavyweight oversized tees printed in Kathmandu — football icons, anime
              back prints, <span className="dev">देसी</span> type, or whatever's living
              in your head.
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
                src="/assets/gunji_post_02.jpg"
                alt="USE दिमाग brown oversized tee, shot on a Kathmandu street"
                width="1024"
                height="1365"
                fetchpriority="high"
              />
            </figure>
            <div className="hero-cap fi" style={{ "--d": "0.9s" }}>
              <span>Shot — Ason, KTM</span>
              <span className="dev">००२</span>
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
