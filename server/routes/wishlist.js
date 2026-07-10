import { Router } from "express";
import { requireCustomer } from "../lib/authMiddleware.js";
import { listWishlist, addWishlist, removeWishlist, mergeWishlist } from "../db/wishlist.js";

// All wishlist routes require a logged-in customer. Guests keep their wishlist
// in localStorage and merge it here on login.
const router = Router();
router.use(requireCustomer);

router.get("/", async (req, res) => {
  res.json({ items: await listWishlist(req.user.id) });
});

router.post("/", async (req, res) => {
  const variantId = Number(req.body?.variantId);
  if (!Number.isInteger(variantId) || variantId < 1) return res.status(400).json({ error: "Bad variant" });
  await addWishlist(req.user.id, variantId);
  res.status(201).json({ ok: true });
});

router.delete("/:variantId", async (req, res) => {
  const variantId = Number(req.params.variantId);
  if (!Number.isInteger(variantId) || variantId < 1) return res.status(400).json({ error: "Bad variant" });
  await removeWishlist(req.user.id, variantId);
  res.json({ ok: true });
});

router.post("/merge", async (req, res) => {
  const ids = Array.isArray(req.body?.variantIds) ? req.body.variantIds.slice(0, 100) : [];
  res.json({ items: await mergeWishlist(req.user.id, ids) });
});

export default router;
