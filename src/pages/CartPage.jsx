import { Link } from "react-router-dom";
import PageHero from "../components/PageHero.jsx";
import Dev from "../lib/Dev.jsx";
import { useCart } from "../context/Cart.jsx";
import { usePageMeta } from "../lib/seo.js";

const rupees = (n) => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;

export default function CartPage() {
  const { items, setQty, remove, subtotal, count } = useCart();
  usePageMeta({ title: "Your Cart", path: "/cart", noindex: true });

  return (
    <>
      <PageHero
        eyebrowDev="झोला"
        eyebrow="Your cart"
        title="Your cart"
        intro={count > 0 ? `${count} item${count > 1 ? "s" : ""} ready — review and check out.` : "Nothing here yet."}
      />

      <section className="cart-page">
        {items.length === 0 ? (
          <div className="cart-empty">
            <p className="dev" aria-hidden="true">जी</p>
            <p>Your cart is empty.</p>
            <Link className="btn btn-solid btn-sm" to="/tees">Browse the rack <span className="arr" aria-hidden="true">→</span></Link>
          </div>
        ) : (
          <div className="cart-grid">
            <ul className="cart-lines">
              {items.map((i) => (
                <li className="cart-line" key={i.variantId}>
                  <img className="cart-thumb" src={i.img} alt="" loading="lazy" />
                  <div className="cart-line-main">
                    <Link className="cart-line-name" to={`/product/${i.slug ?? i.productId}`}>
                      <Dev text={i.name} />
                    </Link>
                    <span className="cart-line-sub">{i.size} · {i.color}</span>
                    <button className="cart-remove mono-link" type="button" onClick={() => remove(i.variantId)}>Remove</button>
                  </div>
                  <div className="cart-qty" role="group" aria-label="Quantity">
                    <button type="button" onClick={() => setQty(i.variantId, i.qty - 1)} aria-label="Decrease">−</button>
                    <span>{i.qty}</span>
                    <button type="button" onClick={() => setQty(i.variantId, i.qty + 1)} disabled={i.qty >= (i.maxStock ?? 99)} aria-label="Increase">+</button>
                  </div>
                  <span className="cart-line-total">{rupees(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>

            <aside className="cart-summary">
              <h2 className="cart-summary-title">Summary</h2>
              <div className="cart-summary-row">
                <span>Subtotal</span>
                <span>{rupees(subtotal)}</span>
              </div>
              <p className="cart-summary-note">Delivery is confirmed on your DM — nothing’s charged yet.</p>
              <Link className="btn btn-solid cart-checkout" to="/checkout">
                Checkout <span className="arr" aria-hidden="true">→</span>
              </Link>
              <Link className="mono-link cart-continue" to="/tees">Keep shopping →</Link>
            </aside>
          </div>
        )}
      </section>
    </>
  );
}
