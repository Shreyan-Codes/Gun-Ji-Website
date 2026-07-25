import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../components/PageHero.jsx";
import Dev from "../lib/Dev.jsx";
import AuthPanel from "../components/AuthPanel.jsx";
import { apiPost } from "../lib/api.js";
import { useCart } from "../context/Cart.jsx";
import { useAuth } from "../context/Auth.jsx";
import { useSiteData } from "../context/SiteData.jsx";
import { usePageMeta } from "../lib/seo.js";

const rupees = (n) => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;

// Mirrors PHONE_RULE in server/routes/public.js — at least 7 digits, but
// spaces / dashes / brackets / +977 are all fine. Checked client-side too so a
// missing number fails instantly instead of after a round-trip.
const PHONE_RE = /^(?=(?:\D*\d){7,})[\d+()\-\s]+$/;

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { customer, ready, getToken } = useAuth();
  const { settings } = useSiteData();
  usePageMeta({ title: "Checkout", path: "/checkout", noindex: true });

  // Phone is the only contact we collect — the handle/method picker was
  // removed so there's exactly one number to reach the customer on.
  const [form, setForm] = useState({
    name: customer?.name || "",
    shippingAddress: "",
    shippingPhone: "",
    note: "",
    paymentMethod: "cod",
    website: "",
  });
  // eSewa payment screenshot (optional): { name, dataUrl } or { error }.
  const [proof, setProof] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | sending | error
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [placed, setPlaced] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponQuote, setCouponQuote] = useState(null);
  const [couponStatus, setCouponStatus] = useState("idle");
  const [couponError, setCouponError] = useState("");

  // Opt-in GPS delivery pin. geo = { lat, lng, accuracy } once shared.
  const [geo, setGeo] = useState(null);
  const [geoStatus, setGeoStatus] = useState("idle"); // idle | locating | ok | error
  const [geoError, setGeoError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const discount = couponQuote?.discount || 0;
  const checkoutTotal = subtotal - discount;
  const cartSignature = items.map((item) => `${item.variantId}:${item.qty}`).join("|");

  useEffect(() => {
    setCouponQuote(null);
    setCouponError("");
    setCouponStatus("idle");
  }, [subtotal, cartSignature]);

  async function applyCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (!code || couponStatus === "checking") return;
    setCouponStatus("checking");
    setCouponError("");
    try {
      const quote = await apiPost(
        "/api/coupons/validate",
        {
          code,
          items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
        },
        { token: getToken() }
      );
      setCouponCode(quote.coupon.code);
      setCouponQuote(quote);
      setCouponStatus("applied");
    } catch (err) {
      setCouponQuote(null);
      setCouponStatus("error");
      setCouponError(err.message || "That coupon could not be applied.");
    }
  }

  function removeCoupon() {
    setCouponCode("");
    setCouponQuote(null);
    setCouponStatus("idle");
    setCouponError("");
  }

  function onPickProof(e) {
    const file = e.target.files?.[0];
    if (!file) return setProof(null);
    if (!file.type.startsWith("image/")) return setProof({ error: "Please pick an image." });
    if (file.size > 6 * 1024 * 1024) return setProof({ error: "Image too big (max 6 MB)." });
    const reader = new FileReader();
    reader.onload = () => setProof({ name: file.name, dataUrl: reader.result });
    reader.readAsDataURL(file);
  }

  function shareLocation() {
    if (!("geolocation" in navigator)) {
      setGeoStatus("error");
      setGeoError("Your browser can’t share location. Try another browser, or DM us to order.");
      return;
    }
    setGeoStatus("locating");
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGeo({ lat: +latitude.toFixed(6), lng: +longitude.toFixed(6), accuracy: Math.round(accuracy) });
        setGeoStatus("ok");
      },
      (err) => {
        setGeoStatus("error");
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location is blocked. Allow location for this site in your browser settings, then tap again."
            : "Couldn’t get your location — check that GPS/location is on, then tap again."
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  function clearLocation() {
    setGeo(null);
    setGeoStatus("idle");
    setGeoError("");
  }

  async function submit(e) {
    e.preventDefault();
    if (status === "sending" || items.length === 0) return;

    // Phone is mandatory — catch it here so the shopper sees the error straight
    // away rather than after a failed POST. The server enforces it regardless.
    const phone = form.shippingPhone.trim();
    if (!PHONE_RE.test(phone)) {
      setStatus("error");
      setError("Add a phone number so we can reach you about delivery.");
      setFieldErrors({
        shippingPhone: phone ? "Enter a valid phone number (at least 7 digits)" : "Required",
      });
      return;
    }

    // Location pin is mandatory — the rider needs a map point, not just a
    // typed address. Server enforces it too.
    if (!geo) {
      setStatus("error");
      setError("Share your location so our rider can find you — tap “Share my location” above.");
      setGeoStatus((s) => (s === "error" ? s : "required"));
      return;
    }

    setStatus("sending");
    setError("");
    setFieldErrors({});
    try {
      const res = await apiPost(
        "/api/orders",
        {
          items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
          name: form.name,
          // The phone doubles as the contact of record, so the admin inbox and
          // the owner alerts still have a number to reach out on.
          contact: phone,
          method: "phone",
          shippingAddress: form.shippingAddress,
          shippingPhone: phone,
          note: form.note,
          paymentMethod: form.paymentMethod,
          couponCode: couponQuote?.coupon?.code || "",
          website: form.website,
          ...(geo ? { locationLat: geo.lat, locationLng: geo.lng, locationAccuracy: geo.accuracy } : {}),
        },
        { token: getToken() }
      );
      setPlaced(res.order);
      // Send the eSewa payment screenshot (if any) to the owner. Best-effort:
      // never block the placed order on it.
      if (form.paymentMethod === "esewa" && proof?.dataUrl && res.order?.id) {
        try {
          await apiPost(
            `/api/orders/${res.order.id}/payment-proof`,
            { image: proof.dataUrl },
            { token: getToken() }
          );
        } catch {
          /* owner can still ask for the screenshot on DM */
        }
      }
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
            {placed.trackingCode && (
              <p className="co-done-track">
                Tracking code <strong>{placed.trackingCode}</strong> —{" "}
                <Link className="mono-link" to={`/track?code=${placed.trackingCode}`}>track your order →</Link>
              </p>
            )}
            <ul className="co-done-items">
              {placed.items.map((i) => (
                <li key={i.id}>
                  <span>{i.qty}× <Dev text={i.item} /> <em>{i.size} / {i.colour}</em></span>
                  <span>{rupees(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
            {placed.discount > 0 && (
              <>
                <div className="co-done-price"><span>Subtotal</span><span>{rupees(placed.subtotal)}</span></div>
                <div className="co-done-price co-discount"><span>Coupon · {placed.couponCode}</span><span>−{rupees(placed.discount)}</span></div>
              </>
            )}
            <div className="co-done-total"><span>Total</span><span>{rupees(placed.total)}</span></div>
            <p>We’ll call you on {form.shippingPhone} to confirm delivery &amp; payment shortly.</p>
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

  // ---------- login required ----------
  if (ready && !customer) {
    return (
      <>
        <PageHero
          eyebrowDev="लगइन"
          eyebrow="Checkout"
          title="Log in to order"
          intro="Create a free account or log in first — it links your orders so you can track and reorder easily."
        />
        <section className="checkout-page">
          <AuthPanel />
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
        intro="Drop your details — no payment now. We call you to confirm price, delivery & payment before anything’s charged."
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

            <label className="co-field">
              <span className="co-label">Phone number *</span>
              <input
                type="tel"
                required
                maxLength={40}
                inputMode="tel"
                autoComplete="tel"
                value={form.shippingPhone}
                onChange={set("shippingPhone")}
                placeholder="98XXXXXXXX"
                aria-describedby="co-phone-hint"
              />
              <span className="co-hint" id="co-phone-hint">
                We&apos;ll call you on this number to confirm and deliver your order.
              </span>
              {fieldErrors.shippingPhone && <span className="co-error">{fieldErrors.shippingPhone}</span>}
              {fieldErrors.contact && <span className="co-error">{fieldErrors.contact}</span>}
            </label>

            <label className="co-field">
              <span className="co-label">Delivery address <em>(anywhere in Nepal)</em></span>
              <textarea maxLength={300} rows={2} value={form.shippingAddress} onChange={set("shippingAddress")} placeholder="Tole, city — or arrange on DM" />
            </label>

            <div className={`co-field co-geo ${geoStatus === "required" ? "is-missing" : ""}`}>
              <span className="co-label">Pin your location *</span>
              <span className="co-hint">Required — our rider delivers to this map point.</span>
              {geoStatus === "ok" && geo ? (
                <div className="co-geo-ok">
                  <span className="co-geo-badge">📍 Location captured{geo.accuracy ? ` · ±${geo.accuracy}m` : ""}</span>
                  <a className="mono-link" href={`https://www.google.com/maps?q=${geo.lat},${geo.lng}`} target="_blank" rel="noopener noreferrer">
                    view on map ↗
                  </a>
                  <button type="button" className="co-geo-clear" onClick={clearLocation}>clear</button>
                </div>
              ) : (
                <button type="button" className="btn btn-line-dark btn-sm co-geo-btn" onClick={shareLocation} disabled={geoStatus === "locating"}>
                  {geoStatus === "locating" ? "Getting your location…" : "📍 Share my location"}
                </button>
              )}
              {geoStatus === "error" && <span className="co-error">{geoError}</span>}
              {geoStatus === "required" && <span className="co-error">Required — share your location to place the order.</span>}
            </div>

            <label className="co-field">
              <span className="co-label">Note (optional)</span>
              <input type="text" maxLength={1000} value={form.note} onChange={set("note")} placeholder="Deadline, gift, etc." />
            </label>

            <fieldset className="co-pay">
              <legend className="co-label">Payment</legend>
              <div className="co-pay-opts">
                <label className={`co-pay-opt ${form.paymentMethod === "cod" ? "is-on" : ""}`}>
                  <input type="radio" name="pay" value="cod" checked={form.paymentMethod === "cod"} onChange={set("paymentMethod")} />
                  <span className="co-pay-body">
                    <span className="co-pay-name">Cash on delivery</span>
                    <span className="co-pay-sub">Pay the rider when it arrives</span>
                  </span>
                </label>
                <label className={`co-pay-opt ${form.paymentMethod === "esewa" ? "is-on" : ""}`}>
                  <input type="radio" name="pay" value="esewa" checked={form.paymentMethod === "esewa"} onChange={set("paymentMethod")} />
                  <span className="co-pay-body">
                    <span className="co-pay-name">eSewa</span>
                    <span className="co-pay-sub">Scan the QR &amp; upload the receipt</span>
                  </span>
                </label>
              </div>

              {form.paymentMethod === "esewa" && (
                <div className="co-esewa">
                  <img
                    className="co-esewa-qr"
                    src="/assets/esewa_qr.png"
                    alt="eSewa payment QR code"
                    width="220"
                    height="217"
                  />
                  <div className="co-esewa-info">
                    <p className="co-esewa-id">eSewa ID <strong>9768913498</strong></p>
                    <p>Scan &amp; pay {rupees(checkoutTotal)}, then upload the payment screenshot. We verify before dispatch.</p>
                    <label className="co-esewa-upload">
                      <input type="file" accept="image/*" onChange={onPickProof} />
                      <span>{proof?.name ? `📎 ${proof.name}` : "Upload payment screenshot"}</span>
                    </label>
                    {proof?.error && <span className="co-error">{proof.error}</span>}
                    {proof?.dataUrl && <img className="co-esewa-preview" src={proof.dataUrl} alt="Payment screenshot preview" />}
                  </div>
                </div>
              )}
            </fieldset>

            <label className="of-hp" aria-hidden="true">
              Website<input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
            </label>

            <button className="btn btn-solid co-submit" type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Placing…" : `Place order · ${rupees(checkoutTotal)}`}
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
            <div className="co-coupon">
              <label className="co-label" htmlFor="coupon-code">Coupon code</label>
              {couponQuote ? (
                <div className="co-coupon-applied">
                  <span>
                    <strong>{couponQuote.coupon.code}</strong> applied
                    {couponQuote.coupon.maxDiscountItems === 1 && <small> · discount on 1 T-shirt</small>}
                  </span>
                  <button type="button" onClick={removeCoupon}>Remove</button>
                </div>
              ) : (
                <div className="co-coupon-entry">
                  <input
                    id="coupon-code"
                    type="text"
                    maxLength={32}
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyCoupon();
                      }
                    }}
                    placeholder="Enter code"
                    autoComplete="off"
                  />
                  <button className="btn btn-line-dark btn-sm" type="button" onClick={applyCoupon} disabled={!couponCode.trim() || couponStatus === "checking"}>
                    {couponStatus === "checking" ? "Checking…" : "Apply"}
                  </button>
                </div>
              )}
              {couponError && <span className="co-error">{couponError}</span>}
            </div>
            <div className="cart-summary-row"><span>Subtotal</span><span>{rupees(subtotal)}</span></div>
            {discount > 0 && (
              <div className="cart-summary-row co-discount"><span>Coupon discount</span><span>−{rupees(discount)}</span></div>
            )}
            <div className="cart-summary-row co-sum-grand"><span>Total</span><span>{rupees(checkoutTotal)}</span></div>
            <p className="co-delivery">Delivery ~2 days · inside &amp; outside the valley.</p>
            <p className="co-policies">
              <Link to="/policies/shipping">Shipping</Link> · <Link to="/policies/returns">Returns</Link> · <Link to="/size-guide">Size guide</Link>
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}
