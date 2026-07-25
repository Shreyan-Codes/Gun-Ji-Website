import { SIZE_ROWS, MEASURE_TIPS } from "../data/sizeGuide.js";

// The cm measurement table. `highlight` marks the row for the size the shopper
// has selected on the product page; `how` adds the how-to-measure list (only
// the standalone /size-guide page needs it).
export default function SizeChart({ highlight = "", how = false }) {
  return (
    <>
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
            {SIZE_ROWS.map((r) => (
              <tr key={r.size} className={r.size === highlight ? "is-picked" : undefined}>
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

      {how && (
        <div className="sizeguide-how">
          <h2>How to measure</h2>
          <ul>
            {MEASURE_TIPS.map(([label, tip]) => (
              <li key={label}>
                <strong>{label}</strong> — {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
