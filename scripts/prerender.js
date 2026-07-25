// Post-build prerender — generates static per-route HTML with correct <head>
// meta so link-preview crawlers (Instagram/TikTok/Facebook/Viber) and search
// engines see the right title/description/OG image/JSON-LD WITHOUT executing
// JavaScript. Plain Node, zero dependencies.
//
// This is a META-injection prerender, not full React SSR. Rationale (see
// NOTES.md §3): the SPA fetches product data client-side and its context
// providers touch window/localStorage, so renderToString would yield a
// loading-state body and require risky provider hardening. Every acceptance /
// DoD check depends only on the <head>, which this produces reliably. The
// <div id="root"> stays empty and hydrates client-side exactly as before.
//
// Run automatically via `npm run build` (vite build && node scripts/prerender.js).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");

// ---- must mirror src/lib/seo.js ----
const SITE_URL = "https://www.gunji.live";
const SITE_NAME = "GUN-जी™";
const DEFAULT_TITLE = "Premium T-Shirts at Affordable Prices in Nepal | GUN-जी™";
const DEFAULT_DESC =
  "Buy premium normal-fit t-shirts in Nepal at affordable prices. Shop GUN-जी tees in white or black, or make your own custom print, with nationwide delivery.";
const DEFAULT_IMAGE = `${SITE_URL}/assets/gunji_duo_wide.jpg`;

const rupees = (n) => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;
const pageTitle = (t) => (t ? `${t} · ${SITE_NAME} Nepal` : DEFAULT_TITLE);

// Indexable static routes and the meta each sets client-side (mirrors the
// usePageMeta() calls in each page component).
const STATIC_ROUTES = [
  { path: "/", title: null, description: DEFAULT_DESC, image: DEFAULT_IMAGE, changefreq: "weekly", priority: "1.0" },
  {
    path: "/tees",
    title: "Premium T-Shirts at Affordable Prices in Nepal",
    description:
      "Shop GUN-जी premium normal-fit t-shirts in white or black at affordable prices, with delivery all across Nepal.",
    changefreq: "weekly",
    priority: "0.9",
  },
  // /editions was retired — vercel.json 301s it to /tees, so it's deliberately
  // absent here (no prerendered page, and dropped from sitemap.xml).
  {
    path: "/custom-print",
    title: "Make Your Own Custom T-Shirt in Nepal",
    description:
      "Make your own custom t-shirt in Nepal — send finished artwork, a reference photo, or just an idea. Premium tees delivered nationwide.",
    changefreq: "monthly",
    priority: "0.9",
  },
  {
    path: "/about",
    title: "About — Small Label, Loud Tees",
    description:
      "GUN-जी is a Nepal-based t-shirt label offering premium tees at affordable prices, with delivery all across Nepal.",
    changefreq: "monthly",
    priority: "0.5",
  },
  {
    path: "/size-guide",
    title: "Size Guide — Normal Fit T-Shirt Measurements (cm)",
    description:
      "GUN-जी normal-fit t-shirt size chart in centimetres for XL, XXL and XXXL. Measured flat.",
    changefreq: "yearly",
    priority: "0.4",
  },
  {
    path: "/policies/shipping",
    title: "Shipping & delivery",
    description: "How GUN-जी ships across Nepal — timelines, charges and cash on delivery.",
    changefreq: "yearly",
    priority: "0.3",
  },
  {
    path: "/policies/returns",
    title: "Returns & exchange",
    description: "Returns and exchange policy for GUN-जी normal-fit t-shirts.",
    changefreq: "yearly",
    priority: "0.3",
  },
  {
    path: "/policies/custom-terms",
    title: "Custom print terms",
    description: "Terms for custom / made-to-order prints at GUN-जी.",
    changefreq: "yearly",
    priority: "0.3",
  },
  {
    path: "/policies/privacy",
    title: "Privacy",
    description: "How GUN-जी handles the information you share when you order.",
    changefreq: "yearly",
    priority: "0.3",
  },
];

// ---- escaping ----
const escText = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// ---- tag setters (regex over the machine-generated, stable dist template) ----
function setTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escText(title)}</title>`);
}
function setMeta(html, attr, key, content) {
  const re = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(">)`);
  if (re.test(html)) return html.replace(re, `$1${escAttr(content)}$2`);
  return html.replace("</head>", `<meta ${attr}="${key}" content="${escAttr(content)}">\n</head>`);
}
function setCanonical(html, href) {
  const re = /(<link rel="canonical" href=")[^"]*(">)/;
  if (re.test(html)) return html.replace(re, `$1${escAttr(href)}$2`);
  return html.replace("</head>", `<link rel="canonical" href="${escAttr(href)}">\n</head>`);
}
function injectJsonLd(html, obj) {
  const block = `<script type="application/ld+json">\n${JSON.stringify(obj)}\n</script>\n</head>`;
  return html.replace("</head>", block);
}

// Apply a route's head meta onto the base template.
function applyMeta(template, { title, description, canonical, image, imageAlt, jsonLd }) {
  let html = template;
  html = setTitle(html, title);
  html = setMeta(html, "name", "description", description);
  html = setCanonical(html, canonical);
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:description", description);
  html = setMeta(html, "property", "og:url", canonical);
  html = setMeta(html, "property", "og:image", image);
  if (imageAlt) html = setMeta(html, "property", "og:image:alt", imageAlt);
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "name", "twitter:description", description);
  html = setMeta(html, "name", "twitter:image", image);
  if (jsonLd) html = injectJsonLd(html, jsonLd);
  return html;
}

function writeRoute(routePath, html) {
  const dir = routePath === "/" ? DIST : path.join(DIST, routePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
}

async function fetchProducts() {
  const base = (process.env.VITE_API_URL || "https://gunji-api.onrender.com").replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/api/products`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data.products) ? data.products : [];
  } catch (err) {
    console.warn(`[prerender] product fetch from ${base} failed (${err.message}); prerendering static routes only.`);
    return [];
  }
}

function productMeta(p) {
  const title = pageTitle(`${p.name} — ${rupees(p.price)} Normal Fit Tee`);
  const description = `${p.name} (${p.tag}) — a premium normal-fit t-shirt at an affordable price. ${rupees(p.price)}, delivered across Nepal. Order online or via DM.`;
  const canonical = `${SITE_URL}/product/${p.slug}`;
  const image = p.img?.startsWith("http") ? p.img : `${SITE_URL}${p.img}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    image: [image],
    description: `${p.tag} — a premium normal-fit t-shirt with delivery across Nepal.`,
    sku: p.slug,
    brand: { "@type": "Brand", name: "Gunji" },
    offers: {
      "@type": "Offer",
      url: canonical,
      priceCurrency: "NPR",
      price: p.price,
      itemCondition: "https://schema.org/NewCondition",
      availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
  return { title, description, canonical, image, imageAlt: p.alt || `${p.name} — GUN-जी normal-fit t-shirt`, jsonLd };
}

function writeSitemap(routes) {
  const urls = routes
    .map(
      (r) =>
        `  <url>\n    <loc>${SITE_URL}${r.path === "/" ? "/" : r.path}</loc>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  fs.writeFileSync(path.join(DIST, "sitemap.xml"), xml);
}

function writeRobots() {
  const txt = `# GUN-जी™ — ${SITE_URL}\nUser-agent: *\nAllow: /\nDisallow: /cart\nDisallow: /checkout\nDisallow: /account\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  fs.writeFileSync(path.join(DIST, "robots.txt"), txt);
}

export async function prerender() {
  const templatePath = path.join(DIST, "index.html");
  if (!fs.existsSync(templatePath)) {
    console.error("[prerender] dist/index.html not found — run `vite build` first.");
    return;
  }
  const template = fs.readFileSync(templatePath, "utf8");

  // Static indexable routes.
  for (const r of STATIC_ROUTES) {
    const html = applyMeta(template, {
      title: pageTitle(r.title),
      description: r.description,
      canonical: `${SITE_URL}${r.path === "/" ? "/" : r.path}`,
      image: r.image || DEFAULT_IMAGE,
    });
    writeRoute(r.path, html);
  }

  // Product routes.
  const products = await fetchProducts();
  const productRoutes = [];
  for (const p of products) {
    if (!p.slug) continue;
    const html = applyMeta(template, productMeta(p));
    writeRoute(`/product/${p.slug}`, html);
    productRoutes.push({ path: `/product/${p.slug}`, changefreq: "weekly", priority: "0.7" });
  }

  // Sitemap covers static + products; robots references it.
  writeSitemap([...STATIC_ROUTES, ...productRoutes]);
  writeRobots();

  console.log(
    `[prerender] wrote ${STATIC_ROUTES.length} static + ${productRoutes.length} product pages, sitemap.xml (${STATIC_ROUTES.length + productRoutes.length} urls), robots.txt`
  );
}

// Allow running standalone: `node scripts/prerender.js` (in addition to the
// Vite closeBundle hook that invokes prerender() during `vite build`).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  prerender();
}
