import { useSiteData } from "../context/SiteData.jsx";

// `bare` skips the eyebrow (used when a PageHero already introduces the page).
export default function Brand({ bare = false }) {
  const { settings } = useSiteData();

  return (
    <section className="brand-sect" id="brand">
      {!bare && (
        <p className="eyebrow reveal">
          <span className="dev">बारेमा</span> · The brand
        </p>
      )}
      <p className="brand-statement reveal">
        GUN-<span className="dev">जी</span> is a small Kathmandu label doing one thing
        properly: heavyweight oversized tees with prints people actually stop you
        about. No middlemen, no mass drops — every order goes through a DM.
      </p>
      <div className="brand-stats reveal">
        <div>
          <span className="stat-num">9+</span>
          <span className="stat-label">designs dropped</span>
        </div>
        <div>
          <span className="stat-num">3</span>
          <span className="stat-label">base colours</span>
        </div>
        <div>
          <span className="stat-num">1</span>
          <span className="stat-label">city — KTM</span>
        </div>
      </div>
      <a className="mono-link reveal" href={settings.igProfile} target="_blank" rel="noopener noreferrer">
        Follow @gunji.clo1 ↗
      </a>
    </section>
  );
}
