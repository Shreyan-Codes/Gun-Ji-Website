import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Dev from "../lib/Dev.jsx";
import { apiGet } from "../lib/api.js";

const rupees = (n) => (typeof n === "number" ? `Rs. ${n.toLocaleString("en-IN")}` : n);
const TOP = [
  { key: "signature", label: "Signature" },
  { key: "essentials", label: "Essentials" },
  { key: "custom", label: "Custom Print" },
];

// Search overlay: debounced (250ms) query to /api/search, results list, and an
// empty state that offers the top collections instead of a dead end.
export default function SearchOverlay({ onClose }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | done
  const inputRef = useRef(null);
  const trigger = useRef(typeof document !== "undefined" ? document.activeElement : null);

  useEffect(() => {
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && (e.preventDefault(), onClose());
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      trigger.current?.focus?.();
    };
  }, [onClose]);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    let alive = true;
    const t = setTimeout(() => {
      apiGet(`/api/search?q=${encodeURIComponent(term)}`)
        .then((d) => alive && (setResults(d.results || []), setStatus("done")))
        .catch(() => alive && (setResults([]), setStatus("done")));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const term = q.trim();
  return (
    <div className="search-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="search-box" role="dialog" aria-modal="true" aria-label="Search">
        <div className="search-input-row">
          <input
            ref={inputRef}
            className="search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tees…"
            aria-label="Search products"
          />
          <button className="search-close" type="button" onClick={onClose} aria-label="Close search">✕</button>
        </div>

        <div className="search-results">
          {status === "loading" && <p className="search-note">Searching…</p>}

          {status === "done" &&
            results.map((p) => (
              <Link key={p.slug} className="search-hit" to={`/product/${p.slug}`} onClick={onClose}>
                <img src={p.img} alt="" loading="lazy" />
                <span className="search-hit-name"><Dev text={p.name} /></span>
                <span className="search-hit-price">{p.priceFrom ? "from " : ""}{rupees(p.price)}</span>
              </Link>
            ))}

          {status === "done" && term && results.length === 0 && (
            <p className="search-note">Nothing for “{term}”.</p>
          )}

          {(!term || (status === "done" && results.length === 0)) && (
            <div className="search-suggest">
              <span className="search-suggest-lbl">Browse</span>
              {TOP.map((c) => (
                <Link key={c.key} className={`chip ${c.dev ? "dev" : ""}`} to={`/tees?collection=${c.key}`} onClick={onClose}>
                  {c.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
