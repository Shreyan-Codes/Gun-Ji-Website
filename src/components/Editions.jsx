import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { editions } from "../data/products.jsx";

const nums = ["०१", "०२", "०३", "०४"];

// `bare` skips the section heading (used when a PageHero already introduces it).
export default function Editions({ bare = false }) {
  const [active, setActive] = useState(-1);
  const floatRef = useRef(null);
  const indexRef = useRef(null);

  const onMove = (e) => {
    const float = floatRef.current;
    const index = indexRef.current;
    if (!float || !index) return;
    const rect = index.getBoundingClientRect();
    const x = e.clientX - rect.left + 32;
    const y = e.clientY - rect.top;
    float.style.transform = `translate3d(${x}px, ${y}px, 0) translateY(-50%) rotate(-2.5deg)`;
  };

  return (
    <section className="editions" id="editions">
      {!bare && (
        <div className="sect-head reveal">
          <p className="eyebrow">
            <span className="dev">संग्रह</span> · The editions
          </p>
          <h2>Four ways to wear it</h2>
        </div>
      )}
      <div
        className="edition-index reveal"
        ref={indexRef}
        onMouseMove={onMove}
        onMouseLeave={() => setActive(-1)}
      >
        {editions.map((ed, i) => (
          <Link
            to={ed.to}
            className="edition-row"
            key={i}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
          >
            <span className="edition-num dev" aria-hidden="true">{nums[i]}</span>
            <span className="edition-name">{ed.title}</span>
            <span className="edition-desc">{ed.desc}</span>
            <img className="edition-thumb" src={ed.img} alt="" loading="lazy" aria-hidden="true" />
            <span className="edition-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
        <figure className={`edition-float ${active >= 0 ? "on" : ""}`} ref={floatRef} aria-hidden="true">
          <img src={active >= 0 ? editions[active].img : editions[0].img} alt="" />
        </figure>
      </div>
    </section>
  );
}
