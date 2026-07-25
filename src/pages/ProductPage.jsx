import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { apiGet } from "../lib/api.js";
import { useCart } from "../context/Cart.jsx";
import { useWishlist } from "../context/Wishlist.jsx";
import { useSiteData } from "../context/SiteData.jsx";
import Dev from "../lib/Dev.jsx";
import SizeChart from "../components/SizeChart.jsx";
import { usePageMeta, useJsonLd, SITE_URL } from "../lib/seo.js";

const rupees = (n) => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;

// Per-variant stock status, with a fallback for pre-migration data.
const statusOf = (v) => v?.stockStatus ?? (v?.stock > 0 ? "in_stock" : "out_of_stock");

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
  const wishlist = useWishlist();
  const { orderLink } = useSiteData();

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

  // Per-product SEO: dynamic title/description + Product structured data so
  // Google can show price and stock status in search results.
  usePageMeta({
    title: product ? `${product.name} — ${rupees(product.price)} Normal Fit Tee` : "Tees",
    description: product
      ? `${product.name} (${product.tag}) — a premium normal-fit t-shirt at an affordable price. ${rupees(product.price)}, delivered across Nepal. Order online or via DM.`
      : undefined,
    path: `/product/${slug}`,
    image: product?.img,
  });
  useJsonLd(
    "product",
    product && {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      image: [`${SITE_URL}${product.img}`],
      description: `${product.tag} — a premium normal-fit t-shirt with delivery across Nepal.`,
      sku: product.slug,
      brand: { "@type": "Brand", name: "Gunji" },
      offers: {
        "@type": "Offer",
        url: `${SITE_URL}/product/${product.slug}`,
        priceCurrency: "NPR",
        price: product.price,
        itemCondition: "https://schema.org/NewCondition",
        availability: (() => {
          const sts = (product.variants ?? []).map(statusOf);
          if (sts.includes("in_stock")) return "https://schema.org/InStock";
          if (sts.includes("pre_order")) return "https://schema.org/PreOrder";
          return "https://schema.org/OutOfStock";
        })(),
      },
    }
  );

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
    const firstInStock =
      sizesForColor.find((v) => statusOf(v) === "in_stock" && v.stock > 0) ||
      sizesForColor.find((v) => statusOf(v) === "pre_order") ||
      sizesForColor[0];
    setSize(firstInStock?.size ?? "");
    setQty(1);
    setAdded(false);
  }, [color, sizesForColor]);

  if (status === "loading") {
    // Skeleton mirrors the real layout so a slow (cold-start) backend never
    // renders as a blank/broken page — see the cold-start note in NOTES.md.
    return (
      <section className="product-page" aria-busy="true">
        <div className="pp-grid">
          <div className="pp-media sk-block" aria-hidden="true" />
          <div className="pp-info">
            <div className="sk-line sk-w-30" aria-hidden="true" />
            <div className="sk-line sk-w-70 sk-tall" aria-hidden="true" />
            <div className="sk-line sk-w-40" aria-hidden="true" />
            <div className="sk-line sk-w-90" aria-hidden="true" />
            <div className="sk-line sk-w-60" aria-hidden="true" />
            <div className="sk-row" aria-hidden="true">
              <div className="sk-chip" /><div className="sk-chip" /><div className="sk-chip" />
            </div>
            <div className="sk-line sk-w-50 sk-btn" aria-hidden="true" />
          </div>
        </div>
        <span className="sr-only">Loading this tee…</span>
      </section>
    );
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
  const vStatus = variant ? statusOf(variant) : null;
  const canAdd = !isCustom && variant && vStatus === "in_stock" && maxStock > 0;
  const saved = variant ? wishlist.has(variant.id) : false;

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
            {product.compareAt && product.compareAt > product.price && (
              <>
                <span className="price-was">{rupees(product.compareAt)}</span>
                <span className="price-off">-{Math.round((1 - product.price / product.compareAt) * 100)}%</span>
              </>
            )}
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
                <span className="pp-label">
                  Size
                  <Link className="pp-size-link" to="/size-guide">Full size guide →</Link>
                </span>
                <div className="pp-sizes">
                  {sizesForColor.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`pp-size ${v.size === size ? "on" : ""}`}
                      disabled={statusOf(v) === "out_of_stock"}
                      aria-pressed={v.size === size}
                      onClick={() => setSize(v.size)}
                    >
                      {v.size}
                    </button>
                  ))}
                </div>

                {/* Measurements inline, collapsed by default — the shopper can
                    check the fit without leaving the page (and losing their
                    picked size/colour). Highlights the row they've selected. */}
                <details className="pp-sizeguide">
                  <summary>
                    <span>Size guide — measurements in cm</span>
                    <span className="pp-sizeguide-caret" aria-hidden="true">▾</span>
                  </summary>
                  <div className="pp-sizeguide-body">
                    <SizeChart highlight={size} />
                    <p className="pp-sizeguide-note">
                      Measured flat across the garment. Between
                      sizes? Size up for a boxier fit.
                    </p>
                  </div>
                </details>
              </div>

              {vStatus === "pre_order" ? (
                <div className="pp-buy">
                  <a
                    className="btn btn-solid"
                    href={orderLink(`Pre-order: ${product.name} (${size} / ${color})`)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Pre-order <span className="arr" aria-hidden="true">↗</span>
                  </a>
                  <p className="pp-stock">
                    Pre-order timing is confirmed by DM before payment · Reserve your {size} / {color}.
                  </p>
                </div>
              ) : (
                <>
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
                      {added ? "Added ✓" : vStatus === "out_of_stock" ? "Out of stock" : "Add to cart"}
                    </button>
                    <button className="btn btn-solid" type="button" onClick={buyNow} disabled={!canAdd}>
                      Buy now <span className="arr" aria-hidden="true">→</span>
                    </button>
                  </div>

                  <p className="pp-stock">
                    {!variant ? "Pick a size" :
                      vStatus === "out_of_stock" ? "Out of stock — check back after the next drop" :
                      maxStock <= 5 ? `Only ${maxStock} left in ${size} / ${color}` :
                      "In stock"}
                  </p>
                  {added && <Link className="mono-link pp-tocart" to="/cart">View cart →</Link>}
                </>
              )}

              <button
                type="button"
                className={`pp-wish ${saved ? "is-saved" : ""}`}
                disabled={!variant}
                aria-pressed={saved}
                onClick={() =>
                  variant &&
                  wishlist.toggle({
                    variantId: variant.id,
                    slug: product.slug,
                    name: product.name,
                    img: product.img,
                    price: product.price,
                    priceFrom: product.priceFrom,
                    size: variant.size,
                    color: variant.color,
                  })
                }
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M12 20s-7-4.3-9.2-8.5C1.3 8.5 2.8 5.5 5.8 5.5c1.9 0 3.2 1.2 4.2 2.5 1-1.3 2.3-2.5 4.2-2.5 3 0 4.5 3 3 6C19 15.7 12 20 12 20Z" />
                </svg>
                {saved ? "Saved to wishlist" : "Save to wishlist"}
              </button>

              <p className="pp-delivery">
                Delivery available across Nepal — <Link to="/policies/shipping">shipping</Link> · <Link to="/size-guide">size guide</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
