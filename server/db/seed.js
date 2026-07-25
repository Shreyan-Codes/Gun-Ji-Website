// Seed sample products + images + variants so the frontend has data to render.
//   npm run seed          — only seeds when there are no products yet
//   npm run seed -- --force  — wipes products/images/variants first, then seeds
//
// Importing ./index.js opens the DB and runs schema + migrations first.
import { db } from "./index.js";
import { createProduct, addImage, addVariant } from "./products.js";

const SIZES = ["XL", "XXL", "XXXL"];

// The normal-fit tee in two colourways and custom print.
// The illustrated print editions (player / anime / देसी) are not stocked — the
// site teases them via ComingSoonCard instead of listing them.
// [name, tag, price, priceFrom, compareAt, edition, images[[url, alt]], orderItem, colours[], stockPerVariant]
const CATALOG = [
  ["GUN-जी Normal Fit T-Shirt", "Normal fit — white", 699, 0, 999, "signature",
    [["/assets/gunji_tee_white_front.jpg", "GUN-जी normal fit t-shirt in white, laid flat"],
     ["/assets/gunji_duo_stack.jpg", "White and black GUN-जी logo tees layered over each other"],
     ["/assets/gunji_duo_detail.jpg", "Close-up of the GUN-जी chest print"]],
    "GUN-जी Normal Fit T-Shirt (white)", ["White"], 12],
  ["GUN-जी Normal Fit T-Shirt — Black", "Normal fit — black", 699, 0, 999, "signature",
    [["/assets/gunji_tee_black_front.jpg", "GUN-जी normal fit t-shirt in black, laid flat"],
     ["/assets/gunji_duo_street.jpg", "GUN-जी logo tees laid out on turf, shot from above"],
     ["/assets/gunji_duo_detail.jpg", "Close-up of the GUN-जी chest print"]],
    "GUN-जी Normal Fit T-Shirt (black)", ["Black"], 12],
  ["Your Print Here", "Custom — any colour, your design", 1099, 1, 1299, "custom",
    [["/assets/gunji_post_08.jpg", "Custom print tee — special price"]],
    "Custom print tee — my own design", ["As shown"], 0],
];

async function runSeed() {
  const force = process.argv.includes("--force");
  const countRow = await db.prepare("SELECT COUNT(*) AS c FROM products").get();
  const count = countRow?.c ?? 0;

  if (count > 0 && !force) {
    console.log(`[seed] ${count} product(s) already exist — run "npm run seed -- --force" to wipe and reseed.`);
    process.exit(0);
  }

  if (force && count > 0) {
    await db.exec("DELETE FROM products;"); // images + variants cascade
    console.log(`[seed] cleared ${count} existing product(s)`);
  }

  let variants = 0;
  for (let i = 0; i < CATALOG.length; i++) {
    const row = CATALOG[i];
    const [name, tag, price, priceFrom, compareAt, edition, images, orderItem, colours, stock] = row;
    const product = await createProduct({
      name, tag, price, priceFrom, compareAt, edition, orderItem, sortOrder: (i + 1) * 10,
    });
    for (let j = 0; j < images.length; j++) {
      const [url, alt] = images[j];
      await addImage(product.id, { url, alt, sortOrder: j });
    }
    for (const color of colours) {
      for (const size of SIZES) {
        const sku = `GJ-${product.id}-${size}-${color.slice(0, 2).toUpperCase()}`;
        await addVariant(product.id, { size, color, stock, sku });
        variants++;
      }
    }
  }

  console.log(`[seed] inserted ${CATALOG.length} products, ${variants} variants`);
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("[seed] error:", err);
  process.exit(1);
});
