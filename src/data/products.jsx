// Static fallback data. The live catalog + contact settings come from the
// backend (/api/products, /api/settings) via SiteDataProvider — this file
// only renders if the API is unreachable, and seeds the DB shape.
// The owner edits the real values at /admin.
export const WHATSAPP_NUMBER = "";

export const IG_DM = "https://ig.me/m/gunji.clo1";
export const IG_PROFILE = "https://www.instagram.com/gunji.clo1/";

// Names/tags are plain strings — <Dev> wraps Devanagari runs at render time.
// Prices are launch placeholders — set the real tags in /admin.
export const products = [
  {
    name: "La Albiceleste ’22",
    tag: "Player Edition — white",
    price: "Rs. 1,099",
    priceWas: "Rs. 1,299",
    img: "/assets/gunji_post_01.jpg",
    alt: "La Albiceleste — Argentina World Cup collage tee in white",
    orderItem: "La Albiceleste '22 (white, oversized)",
    edition: "player",
  },
  {
    name: "Mbappé № 10",
    tag: "Player Edition — black",
    price: "Rs. 1,099",
    priceWas: "Rs. 1,299",
    img: "/assets/gunji_post_07.jpg",
    alt: "Kylian Mbappé number 10 tee in black",
    orderItem: "Mbappé No. 10 (black, oversized)",
    edition: "player",
  },
  {
    name: "Jiraiya — Gama Sennin",
    tag: "Anime — white, back print",
    price: "Rs. 1,099",
    priceWas: "Rs. 1,299",
    img: "/assets/gunji_post_05.jpg",
    alt: "Jiraiya anime back print tee in white",
    orderItem: "Jiraiya back print (white, oversized)",
    edition: "anime",
  },
  {
    name: "USE दिमाग",
    tag: "देसी Type — brown",
    price: "Rs. 1,099",
    priceWas: "Rs. 1,299",
    img: "/assets/gunji_post_02.jpg",
    alt: "USE दिमाग tee in brown",
    orderItem: "USE Dimaag tee (brown, oversized)",
    edition: "desi",
  },
  {
    name: "The Essentials",
    tag: "Plain oversized — black / bone / brown",
    price: "Rs. 699",
    img: "/assets/gunji_post_09.jpg",
    alt: "Plain oversized tees in bone, brown and black on wooden hangers",
    orderItem: "Essentials plain oversized tee",
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
  { key: "player", label: "Player Edition" },
  { key: "anime", label: "Anime" },
  { key: "desi", label: "देसी Type", dev: true },
  { key: "essentials", label: "Essentials" },
  { key: "custom", label: "Custom" },
];

export const editions = [
  {
    title: "Player Edition",
    desc: "Messi, Mbappé, Ronaldo, Yamal — wear your football icon.",
    img: "/assets/gunji_post_04.jpg",
    alt: "Argentina World Cup illustrated tee, close up",
    to: "/tees",
  },
  {
    title: "Anime",
    desc: "Back prints with main-character energy.",
    img: "/assets/gunji_post_05.jpg",
    alt: "Jiraiya anime back print on white oversized tee",
    to: "/tees",
  },
  {
    title: (
      <>
        <span className="dev">देसी</span> Type
      </>
    ),
    desc: "Devanagari with attitude. USE दिमाग.",
    img: "/assets/gunji_post_02.jpg",
    alt: "USE दिमाग typographic tee in brown",
    to: "/tees",
  },
  {
    title: "Custom",
    desc: "Your idea. Send it, we print it.",
    img: "/assets/gunji_post_08.jpg",
    alt: "Custom print tee promo",
    to: "/custom-print",
  },
];
