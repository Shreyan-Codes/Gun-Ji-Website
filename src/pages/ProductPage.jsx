import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { apiGet } from "../lib/api.js";
import { useCart } from "../context/Cart.jsx";
import Dev from "../lib/Dev.jsx";

const rupees = (n) => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;

// Colour name → swatch fill. Unknown colours fall back to a neutral.
const SWATCH = {
  white: "#f4f1ea", bone: "#e2d7c5", black: "#2a2420", brown: "#6f4e37",
  "as shown": "linear-gradient(135deg,#e2d7c5 0 50%,#6f4e37 50% 100%)",
};
const swatch = (c) => SWATCH[String(c).toLowerCase()] || "#cbbda6";

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();

  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | notfound
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    apiGet(`/api/products/${encodeURIComponent(slug)}`)
      .then((d) => {
        if (!alive) return;
        setProduct(d.product);
        setStatus("ok");
      })
      .catch(() => alive && setStatus("notfound"));
    return () => { alive = false; };
  }, [slug]);

  const colors = useMemo(
    () => [...new Set((product?.variants ?? []).map((v) => v.color))],
    [product]
  );
  const sizesForColor = useMemo(
    () => (product?.variants ?? []).filter((v) => v.color === color),
    [product, color]
  );
  const variant = useMemo(
    () => (product?.variants ?? []).find((v) => v.color === color && v.size === size) || null,
    [product, color, size]
  );

  // Default the pickers once the product loads.
  useEffect(() => {
    if (!product) return;
    const firstColor = product.variants[0]?.color ?? "";
    setColor(firstColor);
  }, [product]);
  useEffect(() => {
    const firstInStock = sizesForColor.find((v) => v.stock > 0) || sizesForColor[0];
    setSize(firstInStock?.size ?? "");
    setQty(1);
    setAdded(false);
  }, [color, sizesForColor]);

  if (status === "loading") {
    return <section className="product-page"><p className="pp-loading">Loading…</p></section>;
  }
  if (status === "notfound" || !product) {
    return (
      <section className="product-page">
        <div className="pp-missing">
          <p>We couldn’t find that tee.</p>
          <Link className="btn btn-line-dark btn-sm" to="/tees">Back to the rack →</Link>
        </div>
      </section>
    );
  }

  const isCustom = product.edition === "custom";
  const maxStock = variant?.stock ?? 0;
  const canAdd = !isCustom && variant && maxStock > 0;

  function addToCart() {
    if (!canAdd) return;
    add({
      variantId: variant.id, productId: product.id, slug: product.slug,
      name: product.name, img: product.img, size: variant.size, color: variant.color,
      price: product.price, maxStock: variant.stock,
    }, qty);
    setAdded(true);
  }
  function buyNow() {
    if (!canAdd) return;
    addToCart();
    navigate("/checkout");
  }

  return (
    <section className="product-page">
      <div className="pp-grid">
        <figure className="pp-media">
          <img src={product.img} alt={product.alt || product.name} width="1024" height="1280" />
          <span className="pp-plate">PL·<span className="dev">{product.edition}</span></span>
        </figure>

        <div className="pp-info">
          <Link className="pp-back mono-link" to="/tees">← All tees</Link>
          <p className="eyebrow"><span className="dev">जी</span> · {product.tag}</p>
          <h1 className="pp-name"><Dev text={product.name} /></h1>
          <p className="pp-price">
            {product.priceFrom ? "from " : ""}{rupees(product.price)}
          </p>
          {product.description && <p className="pp-desc">{product.description}</p>}

          {isCustom ? (
            <div className="pp-custom">
              <p>This one’s made to order — start with your design and we’ll price it with you.</p>
              <Link className="btn btn-solid" to="/custom-print">
                Start a custom print <span className="arr" aria-hidden="true">→</span>
              </Link>
            </div>
          ) : (
            <>
              <div className="pp-field">
                <span className="pp-label">Colour{color ? ` — ${color}` : ""}</span>
                <div className="pp-swatches">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`pp-swatch ${c === color ? "on" : ""}`}
                      style={{ background: swatch(c) }}
                      aria-label={c}
                      aria-pressed={c === color}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>

              <div className="pp-field">
                <span className="pp-label">Size</span>
                <div className="pp-sizes">
                  {sizesForColor.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`pp-size ${v.size === size ? "on" : ""}`}
                      disabled={v.stock <= 0}
                      aria-pressed={v.size === size}
                      onClick={() => setSize(v.size)}
                    >
                      {v.size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pp-buy">
                <div className="pp-qty" role="group" aria-label="Quantity">
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
                  <span>{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(maxStock || 1, q + 1))}
                    disabled={qty >= maxStock}
                    aria-label="Increase"
                  >+</button>
                </div>
                <button className="btn btn-line-dark" type="button" onClick={addToCart} disabled={!canAdd}>
                  {added ? "Added ✓" : "Add to cart"}
                </button>
                <button className="btn btn-solid" type="button" onClick={buyNow} disabled={!canAdd}>
                  Buy now <span className="arr" aria-hidden="true">→</span>
                </button>
              </div>

              <p className="pp-stock">
                {!variant ? "Pick a size" :
                  maxStock <= 0 ? "Out of stock — check back after the next drop" :
                  maxStock <= 5 ? `Only ${maxStock} left in ${size} / ${color}` :
                  "In stock"}
              </p>
              {added && <Link className="mono-link pp-tocart" to="/cart">View cart →</Link>}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
