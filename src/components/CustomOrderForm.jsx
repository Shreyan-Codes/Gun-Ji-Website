import { useState } from "react";
import { apiPost } from "../lib/api.js";
import { useSiteData } from "../context/SiteData.jsx";
import { T_SHIRT_SIZES } from "../data/sizeGuide.js";

const methodPlaceholders = {
  instagram: "@your.handle",
  whatsapp: "98XXXXXXXX",
  phone: "98XXXXXXXX",
};

const initial = {
  name: "",
  method: "instagram",
  contact: "",
  colour: "",
  size: "",
  qty: 1,
  idea: "",
  referenceUrl: "",
  website: "", // honeypot — stays empty for humans
};

// Posts a custom-print inquiry to the backend; it lands in the /admin inbox.
// Ordering still finishes in the DMs — this just means ideas can arrive
// while the owner sleeps.
export default function CustomOrderForm() {
  const { orderLink } = useSiteData();
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setErrorMsg("");
    setFieldErrors({});
    try {
      await apiPost("/api/custom-requests", { ...form, qty: Number(form.qty) || 1 });
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setFieldErrors(err.errors || {});
      setErrorMsg(err.message || "Something went wrong.");
    }
  }

  if (status === "sent") {
    return (
      <section className="order-form-sect" id="send-idea">
        <div className="of-done">
          <span className="of-done-stamp dev" aria-hidden="true">जी</span>
          <h2>
            <span className="dev">पाइयो</span> — got it!
          </h2>
          <p>
            Your idea is in the studio inbox. We'll get back on your{" "}
            {form.method === "instagram" ? "Instagram" : form.method === "whatsapp" ? "WhatsApp" : "phone"}{" "}
            within a day to talk print, price and delivery.
          </p>
          <a className="mono-link" href={orderLink()} target="_blank" rel="noopener noreferrer">
            In a hurry? DM us now ↗
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="order-form-sect" id="send-idea">
      <div className="sect-head reveal">
        <p className="eyebrow">
          <span className="dev">पठाउनुहोस्</span> · Send it now
        </p>
        <h2>Drop the idea here</h2>
        <p className="sect-note">
          No payment, no account — tell us what you want printed and where to
          reach you. We reply with price &amp; timeline, then it's a normal DM order.
        </p>
      </div>

      <form className="order-form reveal" onSubmit={submit} noValidate={false}>
        <label className="of-field">
          <span className="of-label">Your name *</span>
          <input type="text" required maxLength={80} value={form.name} onChange={set("name")} autoComplete="name" />
          {fieldErrors.name && <span className="of-error">{fieldErrors.name}</span>}
        </label>

        <label className="of-field">
          <span className="of-label">Reach you on</span>
          <select value={form.method} onChange={set("method")}>
            <option value="instagram">Instagram</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Phone call</option>
          </select>
        </label>

        <label className="of-field">
          <span className="of-label">Handle / number *</span>
          <input
            type="text"
            required
            maxLength={120}
            value={form.contact}
            onChange={set("contact")}
            placeholder={methodPlaceholders[form.method]}
          />
          {fieldErrors.contact && <span className="of-error">{fieldErrors.contact}</span>}
        </label>

        <label className="of-field">
          <span className="of-label">Tee colour</span>
          <select value={form.colour} onChange={set("colour")}>
            <option value="">Any / not sure</option>
            <option>Black</option>
            <option>Bone</option>
            <option>Brown</option>
          </select>
        </label>

        <label className="of-field">
          <span className="of-label">Size</span>
          <select value={form.size} onChange={set("size")}>
            <option value="">Not sure yet</option>
            {T_SHIRT_SIZES.map((size) => <option key={size}>{size}</option>)}
          </select>
        </label>

        <label className="of-field">
          <span className="of-label">How many</span>
          <input type="number" min={1} max={99} value={form.qty} onChange={set("qty")} />
        </label>

        <label className="of-field of-field-wide">
          <span className="of-label">The idea *</span>
          <textarea
            required
            maxLength={2000}
            rows={4}
            value={form.idea}
            onChange={set("idea")}
            placeholder="Artwork you have, a screenshot you saw, or just words — 'Jiraiya but in brick red on bone, back print'…"
          />
          {fieldErrors.idea && <span className="of-error">{fieldErrors.idea}</span>}
        </label>

        <label className="of-field of-field-wide">
          <span className="of-label">Link to a reference (optional)</span>
          <input
            type="url"
            maxLength={400}
            value={form.referenceUrl}
            onChange={set("referenceUrl")}
            placeholder="https://…"
          />
          {fieldErrors.referenceUrl && <span className="of-error">{fieldErrors.referenceUrl}</span>}
        </label>

        {/* honeypot — invisible to people, irresistible to bots */}
        <label className="of-hp" aria-hidden="true">
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={set("website")}
          />
        </label>

        <div className="of-foot">
          <button className="btn btn-solid" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Sending…" : "Send the idea"}{" "}
            <span className="arr" aria-hidden="true">↗</span>
          </button>
          {status === "error" && (
            <p className="of-error of-error-main" role="alert">
              {errorMsg}{" "}
              <a className="mono-link" href={orderLink("Custom print — here's my idea:")} target="_blank" rel="noopener noreferrer">
                or just DM us ↗
              </a>
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
