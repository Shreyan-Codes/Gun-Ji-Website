import PageHero from "../components/PageHero.jsx";
import SizeChart from "../components/SizeChart.jsx";
import { usePageMeta } from "../lib/seo.js";

// Real, indexable cm table (not a JPEG) — the rows live in src/data/sizeGuide.js
// so the product page's inline chart stays in sync with this one.
export default function SizeGuidePage() {
  usePageMeta({
    title: "Size Guide — Normal Fit T-Shirt Measurements (cm)",
    description:
      "GUN-जी normal-fit t-shirts are available in S, M and L, with delivery across Nepal.",
    path: "/size-guide",
  });

  return (
    <>
      <PageHero
        eyebrowDev="नाप"
        eyebrow="Size guide"
        title="Find your fit"
        intro="Available sizes are S, M and L. Use these common unisex measurements as a fit reference."
      />

      <section className="sizeguide">
        <SizeChart how />
        <p className="sizeguide-note">
          These are approximate reference measurements, rounded to the nearest centimetre.
          Actual GUN-जी measurements can vary by production batch. Compare them with a
          t-shirt you already like, or{" "}
          <a href="https://ig.me/m/gunji.clo1" target="_blank" rel="noopener noreferrer">DM us</a> your height &amp; usual fit.
        </p>
      </section>
    </>
  );
}
