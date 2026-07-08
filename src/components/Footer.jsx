import { useSiteData } from "../context/SiteData.jsx";

export default function Footer() {
  const { settings } = useSiteData();
  const waHref = settings.whatsappNumber ? `https://wa.me/${settings.whatsappNumber}` : settings.igDm;
  const year = new Date().getFullYear();

  return (
    <footer className="site-foot">
      <div className="foot-inner">
        <div className="foot-top">
          <div>
            <p className="foot-mark">
              GUN<span className="hero-dash">—</span><span className="dev">जी</span>
              <sup>™</sup>
            </p>
            <p className="foot-tagline">
              Heavyweight custom tees, printed one DM at a time in Kathmandu.
            </p>
          </div>
          <div className="foot-channels">
            <a
              className="foot-channel foot-channel-primary"
              href={settings.igDm}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>Instagram DM — order here</span>
              <span className="foot-arrow" aria-hidden="true">↗</span>
            </a>
            <a className="foot-channel" href={waHref} target="_blank" rel="noopener noreferrer">
              <span>WhatsApp</span>
              <span className="foot-arrow" aria-hidden="true">↗</span>
            </a>
            <a className="foot-channel" href={settings.igProfile} target="_blank" rel="noopener noreferrer">
              <span>@gunji.clo1</span>
              <span className="foot-arrow" aria-hidden="true">↗</span>
            </a>
          </div>
        </div>

        <div className="foot-meta">
          <div className="foot-meta-col">
            <h4>Studio</h4>
            <p>
              Kathmandu, Nepal
              <br />
              <span className="dev">काठमाडौं, नेपाल</span>
            </p>
          </div>
          <div className="foot-meta-col">
            <h4>Orders</h4>
            <p>
              DM first, print after.
              <br />
              Pickup in KTM · shipping across Nepal.
            </p>
          </div>
          <div className="foot-meta-col">
            <h4>Fit</h4>
            <p>
              Premium heavyweight cotton.
              <br />
              Oversized — black, bone &amp; brown.
            </p>
          </div>
        </div>

        <p className="foot-fine">
          <span>© {year} GUN-जी™</span>
          <span className="foot-sep" aria-hidden="true">✦</span>
          <span>Designed by You • Printed by Us</span>
          <span className="foot-sep" aria-hidden="true">✦</span>
          <span className="dev">तपाईंको डिजाइन, हाम्रो प्रिन्ट</span>
        </p>
      </div>
    </footer>
  );
}
