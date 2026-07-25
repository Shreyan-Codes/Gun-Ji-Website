import { useParams, Navigate } from "react-router-dom";
import PageHero from "../components/PageHero.jsx";
import { usePageMeta } from "../lib/seo.js";

// Plain, indexable policy pages. Copy is practical, not legal boilerplate —
// {{TODO: legal review}} before treating any of it as binding.
const POLICIES = {
  shipping: {
    dev: "ढुवानी",
    eyebrow: "Shipping & delivery",
    title: "Getting it to you",
    desc: "How GUN-जी ships across Nepal — timelines, charges and cash on delivery.",
    blocks: [
      ["h", "Timelines"],
      ["p", "Orders are printed to order and delivered across Nepal. Delivery time depends on the destination. {{TODO: confirm exact timelines}}"],
      ["h", "Charges"],
      ["p", "Delivery charges depend on location. {{TODO: confirm delivery charges inside vs outside valley}}"],
      ["h", "Cash on delivery"],
      ["p", "COD is available across Nepal — pay the rider when your tee arrives. You can also pay in advance via eSewa QR at checkout."],
      ["h", "Tracking"],
      ["p", "Every order gets a GJ- tracking code. Check status any time at /track."],
    ],
  },
  returns: {
    dev: "फिर्ता",
    eyebrow: "Returns & exchange",
    title: "If it's not right",
    desc: "Returns and exchange policy for GUN-जी normal-fit t-shirts.",
    blocks: [
      ["h", "Exchanges"],
      ["p", "Wrong size? We'll exchange unworn, unwashed tees with tags on within 7 days of delivery. {{TODO: confirm window}}"],
      ["h", "Custom prints"],
      ["p", "Custom / made-to-order prints can't be returned unless the item arrives faulty or not as agreed."],
      ["h", "Faulty items"],
      ["p", "If there's a print or fabric defect, DM us a photo within 3 days and we'll make it right — replacement or refund."],
      ["h", "How"],
      ["p", "Start any return or exchange by DMing @gunji.clo1 with your order number."],
    ],
  },
  "custom-terms": {
    dev: "कस्टम सर्त",
    eyebrow: "Custom print terms",
    title: "Custom print terms",
    desc: "Terms for custom / made-to-order prints at GUN-जी.",
    blocks: [
      ["h", "Artwork"],
      ["p", "Send finished artwork, a reference, or just an idea — any file type works. You confirm the final mockup before we print."],
      ["h", "Rights"],
      ["p", "You're responsible for having the right to print the artwork you send. We may decline artwork that infringes copyright or is offensive."],
      ["h", "Payment & lead time"],
      ["p", "Custom orders are confirmed after a deposit. Lead time is {{TODO: pre-order lead time}} from mockup approval."],
      ["h", "Final sale"],
      ["p", "Because each custom piece is made for you, custom prints are final sale except for faults (see Returns)."],
    ],
  },
  privacy: {
    dev: "गोपनीयता",
    eyebrow: "Privacy",
    title: "Your data",
    desc: "How GUN-जी handles the information you share when you order.",
    blocks: [
      ["h", "What we collect"],
      ["p", "Only what we need to fulfil your order: name, contact handle/number, delivery address, and — if you share it — an optional GPS pin to help the rider."],
      ["h", "Payment"],
      ["p", "We don't store card details. eSewa payments happen on eSewa; you may upload a payment screenshot, which we use only to confirm your order."],
      ["h", "Sharing"],
      ["p", "We share delivery details only with our delivery partner. We never sell your data. {{TODO: legal review}}"],
      ["h", "Contact"],
      ["p", "Questions about your data? DM @gunji.clo1."],
    ],
  },
};

export default function PolicyPage() {
  const { slug } = useParams();
  const policy = POLICIES[slug];
  usePageMeta(
    policy
      ? { title: policy.eyebrow, description: policy.desc, path: `/policies/${slug}` }
      : { title: "Policies", path: "/policies", noindex: true }
  );

  if (!policy) return <Navigate to="/" replace />;

  return (
    <>
      <PageHero eyebrowDev={policy.dev} eyebrow={policy.eyebrow} title={policy.title} intro={policy.desc} />
      <section className="policy-page">
        {policy.blocks.map((b, i) =>
          b[0] === "h" ? <h2 key={i} className="policy-h">{b[1]}</h2> : <p key={i} className="policy-p">{b[1]}</p>
        )}
      </section>
    </>
  );
}
