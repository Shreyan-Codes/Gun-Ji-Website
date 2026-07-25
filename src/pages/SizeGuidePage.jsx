import PageHero from "../components/PageHero.jsx";
import SizeChart from "../components/SizeChart.jsx";
import { usePageMeta } from "../lib/seo.js";

// Real, indexable cm table (not a JPEG) — the rows live in src/data/sizeGuide.js
// so the product page's inline chart stays in sync with this one.
export default function SizeGuidePage() {
  usePageMeta({
    title: "Size Guide — Normal Fit T-Shirt Measurements (cm)",
    description:
      "GUN-जी normal-fit t-shirt size chart in centimetres for XL, XXL and XXXL. Measured flat.",
    path: "/size-guide",
  });

  return (
    <>
      <PageHero
        eyebrowDev="नाप"
        eyebrow="Size guide"
        title="Find your fit"
        intro="Measurements are in centimetres, taken flat across the garment. {{TODO: confirm real measurements}}"
      />

      <section className="sizeguide">
        <SizeChart how />
        <p className="sizeguide-note">
          Between sizes? For a boxier look, size up. Still unsure —{" "}
          <a href="https://ig.me/m/gunji.clo1" target="_blank" rel="noopener noreferrer">DM us</a> your height &amp; usual fit.
        </p>
      </section>
    </>
  );
}
