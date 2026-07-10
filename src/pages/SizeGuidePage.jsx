import PageHero from "../components/PageHero.jsx";
import { usePageMeta } from "../lib/seo.js";

// Real, indexable cm table (not a JPEG). Values are typical oversized-fit
// measurements — {{TODO: confirm real measurements}} before relying on them.
const ROWS = [
  { size: "S", chest: 54, length: 68, shoulder: 52, sleeve: 22 },
  { size: "M", chest: 56, length: 70, shoulder: 54, sleeve: 23 },
  { size: "L", chest: 58, length: 72, shoulder: 56, sleeve: 24 },
  { size: "XL", chest: 60, length: 74, shoulder: 58, sleeve: 25 },
  { size: "XXL", chest: 62, length: 76, shoulder: 60, sleeve: 26 },
];

export default function SizeGuidePage() {
  usePageMeta({
    title: "Size Guide — Oversized Tee Measurements (cm)",
    description:
      "GUN-जी oversized t-shirt size chart in centimetres — chest, length, shoulder and sleeve per size. Measured flat.",
    path: "/size-guide",
  });

  return (
    <>
      <PageHero
        eyebrowDev="नाप"
        eyebrow="Size guide"
        title="Find your fit"
        intro="All GUN-जी tees are a premium oversized cut. Measurements are in centimetres, taken flat across the garment. {{TODO: confirm real measurements}}"
      />

      <section className="sizeguide">
        <div className="table-scroll">
          <table className="size-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Chest (cm)</th>
                <th>Length (cm)</th>
                <th>Shoulder (cm)</th>
                <th>Sleeve (cm)</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.size}>
                  <th scope="row">{r.size}</th>
                  <td>{r.chest}</td>
                  <td>{r.length}</td>
                  <td>{r.shoulder}</td>
                  <td>{r.sleeve}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sizeguide-how">
          <h2>How to measure</h2>
          <ul>
            <li><strong>Chest</strong> — measure flat across, one armpit to the other, then double it.</li>
            <li><strong>Length</strong> — from the highest shoulder point straight down to the hem.</li>
            <li><strong>Shoulder</strong> — seam to seam across the back.</li>
            <li><strong>Sleeve</strong> — from the shoulder seam to the sleeve opening.</li>
          </ul>
          <p className="sizeguide-note">
            Between sizes? For a boxier oversized look, size up. Still unsure —{" "}
            <a href="https://ig.me/m/gunji.clo1" target="_blank" rel="noopener noreferrer">DM us</a> your height &amp; usual fit.
          </p>
        </div>
      </section>
    </>
  );
}
