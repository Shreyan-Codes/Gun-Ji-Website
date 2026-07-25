const items = [
  { text: "Designed by You • Printed by Us" },
  { text: "तपाईंको डिजाइन, हाम्रो प्रिन्ट", dev: true },
  { text: "Heavyweight cotton tees" },
  { text: "Signature logo tee — white / black" },
  { text: "Plain cotton essentials" },
  { text: "More editions coming soon" },
  { text: "काठमाडौं, नेपाल", dev: true },
  { text: "Custom orders via DM" },
];

export default function Ticker() {
  // items are doubled so the loop is seamless
  const loop = [...items, ...items];
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {loop.map((item, i) => (
          <span className="ticker-item" key={i}>
            <span className={item.dev ? "dev" : undefined}>{item.text}</span>
            <span className="ticker-star">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
