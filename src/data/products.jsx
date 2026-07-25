// Static fallback data. The live catalog + contact settings come from the
// backend (/api/products, /api/settings) via SiteDataProvider — this file
// only renders if the API is unreachable, and seeds the DB shape.
// The owner edits the real values at /admin.
export const WHATSAPP_NUMBER = "";

export const IG_DM = "https://ig.me/m/gunji.clo1";
export const IG_PROFILE = "https://www.instagram.com/gunji.clo1/";

// Names/tags are plain strings — <Dev> wraps Devanagari runs at render time.
// The signature logo tee leads (it's the newest studio shoot), then the print
// editions. More designs are teased via ComingSoonCard rather than listed here.
export const products = [
  {
    name: "GUN-जी Logo Tee — White",
    tag: "Signature — white",
    price: "Rs. 1,099",
    priceWas: "Rs. 1,299",
    img: "/assets/gunji_tee_white_front.jpg",
    alt: "GUN-जी logo t-shirt in white, laid flat",
    orderItem: "GUN-जी Logo Tee (white)",
    edition: "signature",
  },
  {
    name: "GUN-जी Logo Tee — Black",
    tag: "Signature — black",
    price: "Rs. 1,099",
    priceWas: "Rs. 1,299",
    img: "/assets/gunji_tee_black_front.jpg",
    alt: "GUN-जी logo t-shirt in black, laid flat",
    orderItem: "GUN-जी Logo Tee (black)",
    edition: "signature",
  },
  {
    name: "The Essentials",
    tag: "Plain — black / bone / brown",
    price: "Rs. 699",
    img: "/assets/gunji_post_09.jpg",
    alt: "Plain tees in bone, brown and black on wooden hangers",
    orderItem: "Essentials plain tee",
    edition: "essentials",
  },
  {
    name: "Your Print Here",
    tag: "Custom — any colour, your design",
    price: "from Rs. 699",
    img: "/assets/gunji_post_08.jpg",
    alt: "Custom print tee — special price",
    orderItem: "Custom print tee — my own design",
    edition: "custom",
  },
];

export const editionFilters = [
  { key: "all", label: "All tees" },
  { key: "signature", label: "Signature" },
  { key: "essentials", label: "Essentials" },
  { key: "custom", label: "Custom" },
];
