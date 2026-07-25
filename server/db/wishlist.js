import { db } from "./index.js";

// Wishlist = (user_id, variant_id) pairs. list() returns enough product info to
// render the saved items without extra round-trips.

const listStmt = db.prepare(
  `SELECT w.variant_id, v.size, v.color, p.slug, p.name, p.price, p.price_from,
     (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order, id LIMIT 1) AS img
   FROM wishlist w
   JOIN product_variants v ON v.id = w.variant_id
   JOIN products p ON p.id = v.product_id
   WHERE w.user_id = ?
   ORDER BY w.created_at DESC`
);

export async function listWishlist(userId) {
  const rows = await listStmt.all(userId);
  return rows.map((r) => ({
    variantId: r.variant_id,
    slug: r.slug,
    name: r.name,
    price: r.price,
    priceFrom: !!r.price_from,
    img: r.img ?? "",
    size: r.size,
    color: r.color,
  }));
}

export async function addWishlist(userId, variantId) {
  await db
    .prepare(
      `INSERT INTO wishlist (user_id, variant_id)
       SELECT ?, id FROM product_variants
       WHERE id = ? AND size IN ('S', 'M', 'L')
       ON CONFLICT (user_id, variant_id) DO NOTHING`
    )
    .run(userId, variantId);
}

export async function removeWishlist(userId, variantId) {
  await db.prepare("DELETE FROM wishlist WHERE user_id = ? AND variant_id = ?").run(userId, variantId);
}

// Bulk add on login (guest localStorage → account). Ignores invalid ids.
export async function mergeWishlist(userId, variantIds) {
  for (const id of variantIds) {
    const vid = Number(id);
    if (Number.isInteger(vid) && vid > 0) await addWishlist(userId, vid);
  }
  return listWishlist(userId);
}
