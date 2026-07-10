import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import PageHero from "../components/PageHero.jsx";
import Dev from "../lib/Dev.jsx";
import { apiGet } from "../lib/api.js";
import { usePageMeta } from "../lib/seo.js";

const fmt = (s) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

export default function TrackPage() {
  const [params, setParams] = useSearchParams();
  const [code, setCode] = useState(params.get("code") || "");
  const [status, setStatus] = useState("idle"); // idle | loading | found | notfound | error
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  usePageMeta({ title: "Track your order", path: "/track", noindex: true });

  async function lookup(raw) {
    const c = String(raw || "").trim().toUpperCase();
    if (!c) return;
    setStatus("loading");
    setError("");
    setData(null);
    try {
      const d = await apiGet(`/api/track/${encodeURIComponent(c)}`);
      setData(d);
      setStatus("found");
    } catch (err) {
      setStatus(err.status === 404 ? "notfound" : "error");
      setError(err.message || "Something went wrong.");
    }
  }

  // Auto-lookup if arriving with ?code= (e.g. from the order confirmation).
  useEffect(() => {
    const c = params.get("code");
    if (c) lookup(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(e) {
    e.preventDefault();
    setParams(code ? { code } : {});
    lookup(code);
  }

  return (
    <>
      <PageHero eyebrowDev="कहाँ छ?" eyebrow="Order tracking" title="Where's my tee?" />
      <section className="track-page">
        <form className="track-form" onSubmit={submit}>
          <input
            className="track-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="GJ-XXXXXXXXXX"
            aria-label="Tracking code"
            spellCheck={false}
            autoCapitalize="characters"
          />
          <button className="btn btn-solid" type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Checking…" : "Track"} <span className="arr" aria-hidden="true">→</span>
          </button>
        </form>

        {status === "notfound" && <p className="track-msg">No order with that code. Check it, or DM us.</p>}
        {status === "error" && <p className="track-msg" role="alert">{error}</p>}

        {status === "found" && data && (
          <div className="track-result">
            <div className="track-head">
              <span className="track-code">{data.code}</span>
              <span className="track-placed">Placed {fmt(data.placedAt)}</span>
            </div>
            <ol className="track-timeline">
              {data.timeline.map((s) => (
                <li key={s.key} className={`tt-step ${s.done ? "is-done" : ""} ${s.current ? "is-current" : ""}`}>
                  <span className="tt-dot" aria-hidden="true" />
                  <span className="tt-label">{s.label}</span>
                </li>
              ))}
            </ol>
            <ul className="track-items">
              {data.items.map((i, idx) => (
                <li key={idx}>
                  <span>{i.qty}× <Dev text={i.name} /></span>
                  {i.variant && <em>{i.variant}</em>}
                </li>
              ))}
            </ul>
            <Link className="mono-link" to="/tees">Keep shopping →</Link>
          </div>
        )}
      </section>
    </>
  );
}
