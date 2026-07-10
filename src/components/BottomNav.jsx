import { NavLink } from "react-router-dom";
import { useCart } from "../context/Cart.jsx";

// Mobile-only bottom tab bar (hidden ≥768px via CSS). Five real destinations —
// Search (3f) and Track Order (3b) will swap in once those features exist; for
// now the bar points only at routes that actually work. Active state comes from
// NavLink; the cart badge renders nothing at 0.
const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const tabs = [
  { to: "/", end: true, label: "Home", icon: <path d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" /> },
  { to: "/tees", label: "Shop", icon: <path d="M8 4 5 6.5 7 9l1-1v11h8V8l1 1 2-2.5L16 4a4 4 0 0 1-8 0Z" /> },
  { to: "/custom-print", label: "Custom", icon: <><path d="M12 3v18M3 12h18" /><path d="m6.5 6.5 11 11M17.5 6.5l-11 11" opacity="0.5" /></> },
  { to: "/cart", label: "Cart", cart: true, icon: <path d="M4 5h2l1.6 10.5a1 1 0 0 0 1 .85h8.2a1 1 0 0 0 1-.8L20 8H7" /> },
  { to: "/account", label: "Account", icon: <><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" /></> },
];

export default function BottomNav() {
  const { count } = useCart();

  return (
    <nav className="bottom-nav" aria-label="Primary mobile">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className="bn-item"
          aria-label={t.cart ? `Cart, ${count} item${count === 1 ? "" : "s"}` : t.label}
        >
          <span className="bn-icon">
            <Icon>{t.icon}</Icon>
            {t.cart && count > 0 && <span className="bn-badge">{count > 99 ? "99+" : count}</span>}
          </span>
          <span className="bn-label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
