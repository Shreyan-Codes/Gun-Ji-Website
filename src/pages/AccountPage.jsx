import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../components/PageHero.jsx";
import CtaBand from "../components/CtaBand.jsx";
import AuthPanel from "../components/AuthPanel.jsx";
import Dev from "../lib/Dev.jsx";
import { apiGet } from "../lib/api.js";
import { useAuth } from "../context/Auth.jsx";
import { usePageMeta } from "../lib/seo.js";

const rupees = (n) => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};
const firstName = (name, email) => (name && name.trim().split(/\s+/)[0]) || (email ? email.split("@")[0] : "there");

function OrderHistory() {
  const { getToken } = useAuth();
  const [state, setState] = useState({ status: "loading", orders: [] });

  useEffect(() => {
    let alive = true;
    apiGet("/api/auth/orders", { token: getToken() })
      .then((d) => alive && setState({ status: "ok", orders: d.items || [] }))
      .catch(() => alive && setState({ status: "error", orders: [] }));
    return () => {
      alive = false;
    };
  }, [getToken]);

  if (state.status === "loading") return <p className="account-loading">Loading your orders…</p>;
  if (state.status === "error") return <p className="account-loading">Couldn’t load your orders right now.</p>;

  if (state.orders.length === 0) {
    return (
      <div className="account-empty">
        <p>No orders yet.</p>
        <Link className="btn btn-line-dark btn-sm" to="/order">
          Order a tee <span className="arr" aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  return (
    <ul className="account-orders">
      {state.orders.map((o) => (
        <li className="account-order" key={o.id}>
          <div className="ao-main">
            <span className="ao-id">#{o.id}</span>
            <span className="ao-item"><Dev text={o.item} /></span>
            <span className="ao-sub">
              {o.qty} pc{o.qty > 1 ? "s" : ""}
              {o.size ? ` · ${o.size}` : ""}
              {o.colour ? ` · ${o.colour}` : ""} · {fmtDate(o.createdAt)}
            </span>
          </div>
          <div className="ao-side">
            {o.total ? <span className="ao-total">{rupees(o.total)}</span> : null}
            <span className={`ao-status s-${o.status}`}>{o.status}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Dashboard() {
  const { customer, logout } = useAuth();
  return (
    <div className="account-dash">
      <div className="account-card reveal">
        <div className="account-id">
          {customer.avatarUrl ? (
            <img className="account-avatar" src={customer.avatarUrl} alt="" referrerPolicy="no-referrer" />
          ) : (
            <span className="account-avatar account-avatar-fallback dev" aria-hidden="true">जी</span>
          )}
          <div>
            <h2 className="account-hi">Hi, {firstName(customer.name, customer.email)}</h2>
            <p className="account-email">{customer.email}</p>
            <p className="account-meta">
              {customer.google ? "Google account" : "Email account"}
              {" · joined "}
              {fmtDate(customer.createdAt)}
            </p>
          </div>
        </div>
        <button type="button" className="btn btn-line-dark btn-sm" onClick={logout}>
          Log out
        </button>
      </div>

      <div className="account-orders-head reveal">
        <h3>Your orders</h3>
        <Link className="mono-link" to="/order">New order →</Link>
      </div>
      <OrderHistory />
    </div>
  );
}

export default function AccountPage() {
  const { customer, ready } = useAuth();
  usePageMeta({ title: "Your Account", path: "/account", noindex: true });

  return (
    <>
      <PageHero
        eyebrowDev="खाता"
        eyebrow="Your account"
        title={customer ? "Your account" : "Log in / Sign up"}
        intro={
          customer
            ? "Your GUN-जी account — track the orders you’ve placed and check out faster next time."
            : "Log in or create an account to place orders faster and keep track of everything you’ve ordered."
        }
      />

      <section className="account-sect">
        {!ready ? (
          <p className="account-loading">Loading…</p>
        ) : customer ? (
          <Dashboard />
        ) : (
          <AuthPanel />
        )}
      </section>

      <CtaBand
        titleDev="कस्टम"
        title="— want something one-of-one?"
        to="/custom-print"
        label="Start a custom order"
      />
    </>
  );
}
