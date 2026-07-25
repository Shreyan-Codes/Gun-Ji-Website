import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useSiteData } from "../context/SiteData.jsx";
import { useAuth } from "../context/Auth.jsx";
import { useCart } from "../context/Cart.jsx";
import { useWishlist } from "../context/Wishlist.jsx";
import SearchOverlay from "./SearchOverlay.jsx";

const links = [
  { to: "/tees", en: "Tees", ne: "सूची" },
  { to: "/custom-print", en: "Custom print", ne: "कस्टम" },
  { to: "/about", en: "About", ne: "बारेमा" },
];

// Mega-menu / mobile category hierarchy → shop collections (query-param filters).
const categories = [
  { to: "/tees?collection=signature", label: "Signature Logo Tee", sub: "White · Black" },
  { to: "/tees?collection=essentials", label: "Essentials", sub: "Plain blanks — black, bone, brown" },
  { to: "/custom-print", label: "Custom Print", sub: "Your idea, printed" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { pathname } = useLocation();
  const { settings } = useSiteData();
  const { customer } = useAuth();
  const { count } = useCart();
  const { count: wishCount } = useWishlist();
  const accountLabel = customer ? (customer.name?.trim().split(/\s+/)[0] || "Account") : "Log in";

  useEffect(() => {
    setOpen(false);
    setHidden(false); // always reveal on route change (page scrolls to top)
  }, [pathname]);

  // Hide the header when scrolling down, reveal it when scrolling up.
  // Always visible near the top and whenever the mobile menu is open.
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      if (open || y < 80) setHidden(false);
      else if (y > last + 6) setHidden(true);
      else if (y < last - 6) setHidden(false);
      last = y;
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

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
      <header className={`site-head ${hidden ? "hide" : ""}`}>
        <Link className="brand" to="/" aria-label="GUN-जी home">
          <img className="brand-logo" src="/assets/gunji_logo_wordmark.png" alt="GUN-जी" width="343" height="144" />
        </Link>

        <nav className="site-nav" aria-label="Main">
          {links.map((l) =>
            l.to === "/tees" ? (
              <div className="nav-mega-wrap" key={l.to}>
                <NavLink to={l.to} className="nav-link">
                  <span className="nav-en">{l.en}</span>
                  <span className="nav-ne dev" aria-hidden="true">{l.ne}</span>
                </NavLink>
                <div className="mega" role="menu">
                  {categories.map((c) => (
                    <Link key={c.to} to={c.to} className="mega-link" role="menuitem">
                      <span className="mega-t">{c.label}</span>
                      <span className="mega-s">{c.sub}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <NavLink key={l.to} to={l.to} className="nav-link">
                <span className="nav-en">{l.en}</span>
                <span className="nav-ne dev" aria-hidden="true">{l.ne}</span>
              </NavLink>
            )
          )}
        </nav>

        <button type="button" className="head-search" onClick={() => setSearchOpen(true)} aria-label="Search">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
        </button>

        <NavLink className="head-account" to="/account">
          <span className="head-account-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
            </svg>
          </span>
          {accountLabel}
        </NavLink>

        <NavLink className="head-wish" to="/account" aria-label={`Wishlist, ${wishCount} saved`}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M12 20s-7-4.3-9.2-8.5C1.3 8.5 2.8 5.5 5.8 5.5c1.9 0 3.2 1.2 4.2 2.5 1-1.3 2.3-2.5 4.2-2.5 3 0 4.5 3 3 6C19 15.7 12 20 12 20Z" />
          </svg>
          {wishCount > 0 && <span className="head-cart-count">{wishCount}</span>}
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
        <ul className="menu-cats">
          {categories.map((c) => (
            <li key={c.to}>
              <Link to={c.to} className="menu-cat" tabIndex={open ? 0 : -1}>{c.label}</Link>
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

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  );
}
