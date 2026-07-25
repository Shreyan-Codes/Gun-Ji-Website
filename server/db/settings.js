import { db } from "./index.js";

const DEFAULTS = {
  ig_dm: "https://ig.me/m/gunji.clo1",
  ig_profile: "https://www.instagram.com/gunji.clo1/",
  coming_soon_image: "/assets/gunji_coming_soon.jpg",
  home_gallery: [
    { src: "/assets/gunji_duo_wide.jpg", alt: "GUN-जी t-shirts in white and black, laid side by side", cap: "Both colourways" },
    { src: "/assets/gunji_tee_white_front.jpg", alt: "GUN-जी normal fit t-shirt in white, laid flat", cap: "Normal fit — white" },
    { src: "/assets/gunji_tee_black_front.jpg", alt: "GUN-जी normal fit t-shirt in black, laid flat", cap: "Normal fit — black" },
  ],
};

const selectAll = db.prepare("SELECT key, value FROM settings");
const upsert = db.prepare(
  "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
);

export async function getSettings() {
  const rows = await selectAll.all();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  let homeGallery = DEFAULTS.home_gallery;
  try {
    const parsed = JSON.parse(map.home_gallery || "null");
    if (Array.isArray(parsed) && parsed.length) homeGallery = parsed;
  } catch {
    // Keep the built-in reel if an older/manual setting is malformed.
  }
  return {
    whatsappNumber: map.whatsapp_number ?? "",
    igDm: map.ig_dm || DEFAULTS.ig_dm,
    igProfile: map.ig_profile || DEFAULTS.ig_profile,
    homeGallery,
    comingSoonImage: map.coming_soon_image || DEFAULTS.coming_soon_image,
  };
}

export async function setSetting(key, value) {
  await upsert.run(key, value);
}
