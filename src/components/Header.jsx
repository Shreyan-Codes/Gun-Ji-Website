import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useSiteData } from "../context/SiteData.jsx";
import { useAuth } from "../context/Auth.jsx";
import { useCart } from "../context/Cart.jsx";

const links = [
  { to: "/editions", en: "Editions", ne: "संग्रह" },
  { to: "/tees", en: "Tees", ne: "सूची" },
  { to: "/custom-print", en: "Custom print", ne: "कस्टम" },
  { to: "/about", en: "About", ne: "बारेमा" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { settings } = useSiteData();
  const { customer } = useAuth();
  const { count } = useCart();
  const accountLabel = customer ? (customer.name?.trim().split(/\s+/)[0] || "Account") : "Log in";

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header className="site-head">
        <Link className="brand" to="/" aria-label="GUN-JI home">
          GUN<span className="brand-dash">—</span><span className="dev">जी</span><sup>™</sup>
        </Link>

        <nav className="site-nav" aria-label="Main">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className="nav-link">
              <span className="nav-en">{l.en}</span>
              <span className="nav-ne dev" aria-hidden="true">{l.ne}</span>
            </NavLink>
          ))}
        </nav>

        <NavLink className="head-account" to="/account">
          <span className="head-account-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
            </svg>
          </span>
          {accountLabel}
        </NavLink>

        <NavLink className="head-cart" to="/cart" aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M4 5h2l1.6 10.5a1 1 0 0 0 1 .85h8.2a1 1 0 0 0 1-.8L20 8H7" />
            <circle cx="9.5" cy="20" r="1.2" /><circle cx="17.5" cy="20" r="1.2" />
          </svg>
          {count > 0 && <span className="head-cart-count">{count}</span>}
        </NavLink>

        <Link className="btn btn-solid btn-sm head-cta" to="/tees">
          Shop <span className="arr" aria-hidden="true">→</span>
        </Link>

        <button
          type="button"
          className={`burger ${open ? "open" : ""}`}
          aria-expanded={open}
          aria-controls="menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          <span /><span />
        </button>
      </header>

      <nav id="menu" className={`menu ${open ? "open" : ""}`} aria-label="Mobile" aria-hidden={!open}>
        <ul className="menu-links">
          {links.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} className="menu-link" tabIndex={open ? 0 : -1}>
                {l.en}
                <span className="dev" aria-hidden="true">{l.ne}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="menu-foot">
          <Link className="btn btn-solid" to="/tees" tabIndex={open ? 0 : -1}>
            Shop the rack <span className="arr" aria-hidden="true">→</span>
          </Link>
          <Link className="mono-link" to="/cart" tabIndex={open ? 0 : -1}>
            Cart{count > 0 ? ` (${count})` : ""} →
          </Link>
          <Link className="mono-link" to="/account" tabIndex={open ? 0 : -1}>
            {customer ? `My account — ${accountLabel}` : "Log in / Sign up"} →
          </Link>
          <a
            className="mono-link"
            href={settings.igProfile}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={open ? 0 : -1}
          >
            @gunji.clo1 ↗
          </a>
        </div>
      </nav>
    </>
  );
}
