import { useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../components/PageHero.jsx";
import Dev from "../lib/Dev.jsx";
import { apiPost } from "../lib/api.js";
import { useCart } from "../context/Cart.jsx";
import { useAuth } from "../context/Auth.jsx";
import { useSiteData } from "../context/SiteData.jsx";

const rupees = (n) => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;

const methodPlaceholder = {
  instagram: "@your.handle",
  whatsapp: "98XXXXXXXX",
  phone: "98XXXXXXXX",
  email: "you@email.com",
};

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { customer, getToken } = useAuth();
  const { settings } = useSiteData();

  const [form, setForm] = useState({
    name: customer?.name || "",
    method: "instagram",
    contact: "",
    shippingAddress: "",
    shippingPhone: "",
    note: "",
    website: "",
  });
  const [status, setStatus] = useState("idle"); // idle | sending | error
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [placed, setPlaced] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (status === "sending" || items.length === 0) return;
    setStatus("sending");
    setError("");
    setFieldErrors({});
    try {
      const res = await apiPost(
        "/api/orders",
        {
          items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
          name: form.name,
          contact: form.contact,
          method: form.method,
          shippingAddress: form.shippingAddress,
          shippingPhone: form.shippingPhone,
          note: form.note,
          website: form.website,
        },
        { token: getToken() }
      );
      setPlaced(res.order);
      clear();
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setFieldErrors(err.errors || {});
      setError(err.message || "Something went wrong.");
    }
  }

  function dmConfirm(order) {
    const lines = order.items.map((i) => `${i.qty}× ${i.item} (${i.size}/${i.colour})`).join(", ");
    const msg = `Hi GUN-जी! I just placed order #${order.id} on the site — ${lines}. Total ${rupees(order.total)}. Confirming here.`;
    return settings.whatsappNumber
      ? `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(msg)}`
      : settings.igDm;
  }

  // ---------- confirmation ----------
  if (placed) {
    return (
      <>
        <PageHero eyebrowDev="धन्यवाद" eyebrow="Order placed" title="You're on the rack!" />
        <section className="checkout-page">
          <div className="co-done">
            <span className="co-done-stamp dev" aria-hidden="true">जी</span>
            <p className="co-done-num">Order #{placed.id}</p>
            <ul className="co-done-items">
              {placed.items.map((i) => (
                <li key={i.id}>
                  <span>{i.qty}× <Dev text={i.item} /> <em>{i.size} / {i.colour}</em></span>
                  <span>{rupees(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className="co-done-total"><span>Total</span><span>{rupees(placed.total)}</span></div>
            <p>We’ll confirm delivery &amp; payment on your {form.method === "instagram" ? "Instagram" : form.method === "whatsapp" ? "WhatsApp" : "message"} shortly.</p>
            <div className="co-done-actions">
              <a className="btn btn-solid" href={dmConfirm(placed)} target="_blank" rel="noopener noreferrer">
                Confirm on {settings.whatsappNumber ? "WhatsApp" : "Instagram"} <span className="arr" aria-hidden="true">↗</span>
              </a>
              <Link className="btn btn-line-dark" to="/tees">Keep shopping <span className="arr" aria-hidden="true">→</span></Link>
            </div>
            {customer && <p className="co-done-acct">Saved to your account — see it under <Link to="/account">your orders</Link>.</p>}
          </div>
        </section>
      </>
    );
  }

  // ---------- empty cart ----------
  if (items.length === 0) {
    return (
      <>
        <PageHero eyebrowDev="चेकआउट" eyebrow="Checkout" title="Checkout" />
        <section className="checkout-page">
          <div className="cart-empty">
            <p>Your cart is empty — add a tee first.</p>
            <Link className="btn btn-solid btn-sm" to="/tees">Browse the rack <span className="arr" aria-hidden="true">→</span></Link>
          </div>
        </section>
      </>
    );
  }

  // ---------- form ----------
  return (
    <>
      <PageHero
        eyebrowDev="चेकआउट"
        eyebrow="Checkout"
        title="Almost yours"
        intro="Drop your details — no payment now. We confirm price, delivery & payment on your DM before anything’s charged."
      />
      <section className="checkout-page">
        <div className="co-grid">
          <form className="co-form" onSubmit={submit} noValidate>
            <h2 className="co-form-title">Delivery details</h2>

            <label className="co-field">
              <span className="co-label">Your name *</span>
              <input type="text" required maxLength={80} value={form.name} onChange={set("name")} autoComplete="name" />
              {fieldErrors.name && <span className="co-error">{fieldErrors.name}</span>}
            </label>

            <div className="co-row">
              <label className="co-field">
                <span className="co-label">Reach you on</span>
                <select value={form.method} onChange={set("method")}>
                  <option value="instagram">Instagram</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="phone">Phone</option>
                  <option value="email">Email</option>
                </select>
              </label>
              <label className="co-field">
                <span className="co-label">Handle / number *</span>
                <input type="text" required maxLength={120} value={form.contact} onChange={set("contact")} placeholder={methodPlaceholder[form.method]} />
                {fieldErrors.contact && <span className="co-error">{fieldErrors.contact}</span>}
              </label>
            </div>

            <label className="co-field">
              <span className="co-label">Delivery address <em>(or “pickup in KTM”)</em></span>
              <textarea maxLength={300} rows={2} value={form.shippingAddress} onChange={set("shippingAddress")} placeholder="Tole, city — or arrange on DM" />
            </label>

            <div className="co-row">
              <label className="co-field">
                <span className="co-label">Phone (optional)</span>
                <input type="text" maxLength={40} value={form.shippingPhone} onChange={set("shippingPhone")} />
              </label>
              <label className="co-field">
                <span className="co-label">Note (optional)</span>
                <input type="text" maxLength={1000} value={form.note} onChange={set("note")} placeholder="Deadline, gift, etc." />
              </label>
            </div>

            <label className="of-hp" aria-hidden="true">
              Website<input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
            </label>

            <button className="btn btn-solid co-submit" type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Placing…" : `Place order · ${rupees(subtotal)}`}
              <span className="arr" aria-hidden="true">→</span>
            </button>
            {status === "error" && (
              <p className="co-error co-error-main" role="alert">
                {error}{" "}<Link className="mono-link" to="/cart">review cart →</Link>
              </p>
            )}
          </form>

          <aside className="co-summary">
            <h2 className="cart-summary-title">Order</h2>
            <ul className="co-summary-items">
              {items.map((i) => (
                <li key={i.variantId}>
                  <img src={i.img} alt="" loading="lazy" />
                  <div>
                    <span className="co-sum-name"><Dev text={i.name} /></span>
                    <span className="co-sum-sub">{i.qty}× · {i.size} / {i.color}</span>
                  </div>
                  <span className="co-sum-total">{rupees(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="cart-summary-row co-sum-grand"><span>Subtotal</span><span>{rupees(subtotal)}</span></div>
          </aside>
        </div>
      </section>
    </>
  );
}
