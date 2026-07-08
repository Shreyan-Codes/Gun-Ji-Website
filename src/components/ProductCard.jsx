import { Link } from "react-router-dom";
import Dev from "../lib/Dev.jsx";

export default function ProductCard({ product }) {
  // Link to the product page (variant picker + add to cart). Falls back to the
  // numeric id when a slug isn't available (static/offline catalog).
  const to = `/product/${product.slug ?? product.id}`;

  return (
    <article className="product reveal">
      <Link className="product-img" to={to} aria-label={typeof product.name === "string" ? product.name : "View tee"}>
        <img src={product.img} alt={product.alt} loading="lazy" />
        <span className="plate">
          PL·<span className="dev">{product.num}</span>
        </span>
        <span className="stamp dev" aria-hidden="true">जी</span>
      </Link>
      <div className="product-meta">
        <h3><Link className="product-name-link" to={to}><Dev text={product.name} /></Link></h3>
        <p className="product-tag"><Dev text={product.tag} /></p>
        <div className="product-row">
          <span className="price">{product.price}</span>
          <Link className="mono-link" to={to}>
            View →
          </Link>
        </div>
      </div>
    </article>
  );
}
