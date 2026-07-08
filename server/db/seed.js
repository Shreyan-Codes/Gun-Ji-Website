// Seed sample products + images + variants so the frontend has data to render.
//   npm run seed          — only seeds when there are no products yet
//   npm run seed -- --force  — wipes products/images/variants first, then seeds
//
// Importing ./index.js opens the DB and runs schema + migrations first.
import { db } from "./index.js";
import { createProduct, addImage, addVariant } from "./products.js";

const SIZES = ["S", "M", "L", "XL", "XXL"];

// [name, tag, price, priceFrom, edition, image, alt, orderItem, colours[], stockPerVariant]
const CATALOG = [
  ["La Albiceleste ’22", "Player Edition — white", 1599, 0, "player", "/assets/gunji_post_01.jpg",
    "La Albiceleste — Argentina World Cup collage tee in white", "La Albiceleste '22 (white, oversized)", ["White"], 12],
  ["Mbappé № 10", "Player Edition — black", 1599, 0, "player", "/assets/gunji_post_07.jpg",
    "Kylian Mbappé number 10 tee in black", "Mbappé No. 10 (black, oversized)", ["Black"], 12],
  ["Jiraiya — Gama Sennin", "Anime — white, back print", 1499, 0, "anime", "/assets/gunji_post_05.jpg",
    "Jiraiya anime back print tee in white", "Jiraiya back print (white, oversized)", ["White"], 10],
  ["USE दिमाग", "देसी Type — brown", 1399, 0, "desi", "/assets/gunji_post_02.jpg",
    "USE दिमाग tee in brown", "USE Dimaag tee (brown, oversized)", ["Brown"], 10],
  ["The Essentials", "Plain oversized — black / bone / brown", 999, 0, "essentials", "/assets/gunji_post_09.jpg",
    "Plain oversized tees in bone, brown and black on wooden hangers", "Essentials plain oversized tee",
    ["Black", "Bone", "Brown"], 20],
  ["Your Print Here", "Custom — any colour, your design", 1299, 1, "custom", "/assets/gunji_post_08.jpg",
    "Custom print tee — special price", "Custom print tee — my own design", ["As shown"], 0],
];

const force = process.argv.includes("--force");
const count = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;

if (count > 0 && !force) {
  console.log(`[seed] ${count} product(s) already exist — run "npm run seed -- --force" to wipe and reseed.`);
  process.exit(0);
}

if (force && count > 0) {
  db.exec("DELETE FROM products;"); // images + variants cascade
  console.log(`[seed] cleared ${count} existing product(s)`);
}

let variants = 0;
CATALOG.forEach((row, i) => {
  const [name, tag, price, priceFrom, edition, img, alt, orderItem, colours, stock] = row;
  const product = createProduct({ name, tag, price, priceFrom, edition, orderItem, sortOrder: (i + 1) * 10 });
  addImage(product.id, { url: img, alt });
  for (const color of colours) {
    for (const size of SIZES) {
      const sku = `GJ-${product.id}-${size}-${color.slice(0, 2).toUpperCase()}`;
      addVariant(product.id, { size, color, stock, sku });
      variants++;
    }
  }
});

console.log(`[seed] inserted ${CATALOG.length} products, ${variants} variants`);
process.exit(0);
