import Custom from "../components/Custom.jsx";
import CtaBand from "../components/CtaBand.jsx";
import CustomOrderForm from "../components/CustomOrderForm.jsx";
import { useSiteData } from "../context/SiteData.jsx";
import { usePageMeta } from "../lib/seo.js";

const sendables = [
  {
    dev: "कला",
    title: "Finished artwork",
    desc: "PNG, JPG or vector — we print it exactly as sent.",
  },
  {
    dev: "फोटो",
    title: "A screenshot or reference",
    desc: "Saw it somewhere? Send the picture and we'll redraw it print-ready.",
  },
  {
    dev: "सोच",
    title: "Just an idea",
    desc: "Describe it in a DM — we'll design it with you before printing.",
  },
];

export default function CustomPrintPage() {
  const { settings } = useSiteData();
  usePageMeta({
    title: "Custom T-Shirt Printing in Kathmandu, Nepal",
    description:
      "Print your own t-shirt design in Kathmandu — send finished artwork, a reference photo, or just an idea. Premium heavyweight oversized tees, any colour. Ships across Nepal.",
    path: "/custom-print",
  });

  return (
    <>
      <Custom />

      <section className="sendables">
        <div className="sect-head reveal">
          <p className="eyebrow">
            <span className="dev">के पठाउने</span> · What to send
          </p>
          <h2>Anything works</h2>
        </div>
        <div className="sendable-grid">
          {sendables.map((s) => (
            <div className="sendable-card reveal" key={s.title}>
              <span className="sendable-dev dev">{s.dev}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <CustomOrderForm />

      <CtaBand
        titleDev="हेर्नुहोस्"
        title="— see custom prints we've done."
        href={settings.igProfile}
        label="View on Instagram"
      />
    </>
  );
}
