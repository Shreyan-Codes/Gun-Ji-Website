import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Dev from "../lib/Dev.jsx";
import { useCart } from "../context/Cart.jsx";

const statusOf = (v) => v?.stockStatus ?? (v?.stock > 0 ? "in_stock" : "out_of_stock");
const SWATCH = {
  white: "#f4f1ea", bone: "#e2d7c5", black: "#2a2420", brown: "#6f4e37",
  "as shown": "linear-gradient(135deg,#e2d7c5 0 50%,#6f4e37 50% 100%)",
};
const swatch = (c) => SWATCH[String(c).toLowerCase()] || "#cbbda6";

// Quick-view modal launched from a product card. Traps focus while open, closes
// on Escape / backdrop / close button, and restores focus to the trigger.
export default function QuickView({ product, onClose }) {
  const { add } = useCart();
  const dialogRef = useRef(null);
  const triggerRef = useRef(typeof document !== "undefined" ? document.activeElement : null);

  const images = useMemo(
    () => (product.images?.length ? product.images.map((i) => i.url) : [product.img]).filter(Boolean),
    [product]
  );
  const [imgIdx, setImgIdx] = useState(0);
  const colors = useMemo(() => [...new Set((product.variants || []).map((v) => v.color))], [product]);
  const [color, setColor] = useState(colors[0] || "");
  const sizesForColor = (product.variants || []).filter((v) => v.color === color);
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const variant = (product.variants || []).find((v) => v.color === color && v.size === size) || null;
  const vStatus = variant ? statusOf(variant) : null;
  const isCustom = product.edition === "custom";
  const canAdd = !isCustom && variant && vStatus === "in_stock" && variant.stock > 0;
  const to = `/product/${product.slug ?? product.id}`;

  useEffect(() => {
    const first = sizesForColor.find((v) => statusOf(v) === "in_stock") || sizesForColor[0];
    setSize(first?.size ?? "");
    setQty(1);
    setAdded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color]);

  // Focus trap, Escape, body scroll lock, focus restore.
  useEffect(() => {
    const node = dialogRef.current;
    const getF = () =>
      [...node.querySelectorAll('a[href],button:not([disabled]),select,input,[tabindex]:not([tabindex="-1"])')];
    getF()[0]?.focus();

    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab") {
        const f = getF();
        if (f.length === 0) return;
        const [a, b] = [f[0], f[f.length - 1]];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          b.focus();
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault();
          a.focus();
        }
      }
    }
    node.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      node.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      triggerRef.current?.focus?.();
    };
  }, [onClose]);

  function addToCart() {
    if (!canAdd) return;
    add(
      {
        variantId: variant.id, productId: product.id, slug: product.slug, name: product.name,
        img: images[0], size: variant.size, color: variant.color, price: product.price, maxStock: variant.stock,
      },
      qty
    );
    setAdded(true);
  }

  return (
    <div className="qv-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="qv-dialog" role="dialog" aria-modal="true" aria-labelledby="qv-title" ref={dialogRef}>
        <button className="qv-close" type="button" onClick={onClose} aria-label="Close quick view">✕</button>

        <div className="qv-media">
          {images[imgIdx] && <img src={images[imgIdx]} alt={product.alt || product.name} />}
          {images.length > 1 && (
            <>
              <button className="qv-nav qv-prev" type="button" aria-label="Previous image"
                onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}>‹</button>
              <button className="qv-nav qv-next" type="button" aria-label="Next image"
                onClick={() => setImgIdx((i) => (i + 1) % images.length)}>›</button>
            </>
          )}
        </div>

        <div className="qv-info">
          <h2 id="qv-title" className="qv-name"><Dev text={product.name} /></h2>
          <p className="qv-price">
            {product.price}
            {product.compareAt && (
              <>
                <span className="price-was">{product.compareAt}</span>
                {product.discountPct ? <span className="price-off">-{product.discountPct}%</span> : null}
              </>
            )}
          </p>

          {isCustom ? (
            <Link className="btn btn-solid" to="/custom-print" onClick={onClose}>
              Start a custom print <span className="arr" aria-hidden="true">→</span>
            </Link>
          ) : (
            <>
              {colors.length > 1 && (
                <div className="qv-swatches">
                  {colors.map((c) => (
                    <button key={c} type="button" className={`pp-swatch ${c === color ? "on" : ""}`}
                      style={{ background: swatch(c) }} aria-label={c} aria-pressed={c === color}
                      onClick={() => setColor(c)} />
                  ))}
                </div>
              )}
              {sizesForColor.length > 0 && (
                <div className="qv-sizes">
                  {sizesForColor.map((v) => (
                    <button key={v.id} type="button" className={`pp-size ${v.size === size ? "on" : ""}`}
                      disabled={statusOf(v) === "out_of_stock"} aria-pressed={v.size === size}
                      onClick={() => setSize(v.size)}>{v.size}</button>
                  ))}
                </div>
              )}
              <div className="qv-buy">
                <div className="pp-qty" role="group" aria-label="Quantity">
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
                  <span>{qty}</span>
                  <button type="button" onClick={() => setQty((q) => Math.min(variant?.stock || 1, q + 1))}
                    disabled={!variant || qty >= variant.stock} aria-label="Increase">+</button>
                </div>
                <button className="btn btn-solid" type="button" onClick={addToCart} disabled={!canAdd}>
                  {added ? "Added ✓" : vStatus === "out_of_stock" ? "Out of stock" : "Add to cart"}
                </button>
              </div>
            </>
          )}

          <Link className="mono-link qv-full" to={to} onClick={onClose}>Full details →</Link>
        </div>
      </div>
    </div>
  );
}
