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
  studio_gallery: [
    { src: "/assets/gunji_post_01.jpg", alt: "Model wearing a custom GUN-जी printed t-shirt", cap: "Custom print — your story" },
    { src: "/assets/gunji_post_02.jpg", alt: "Model wearing a GUN-जी printed t-shirt in Nepal", cap: "Made to be worn" },
    { src: "/assets/gunji_post_03.jpg", alt: "Model showcasing a custom printed GUN-जी t-shirt", cap: "Your idea, on a tee" },
    { src: "/assets/gunji_post_04.jpg", alt: "Model styled in a custom GUN-जी t-shirt", cap: "From screen to street" },
  ],
};

const selectAll = db.prepare("SELECT key, value FROM settings");
const upsert = db.prepare(
  "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
);

function readGallery(raw, fallback) {
  try {
    const parsed = JSON.parse(raw || "null");
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    // Keep the built-in gallery if an older/manual setting is malformed.
  }
  return fallback;
}

export async function getSettings() {
  const rows = await selectAll.all();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    whatsappNumber: map.whatsapp_number ?? "",
    igDm: map.ig_dm || DEFAULTS.ig_dm,
    igProfile: map.ig_profile || DEFAULTS.ig_profile,
    homeGallery: readGallery(map.home_gallery, DEFAULTS.home_gallery),
    studioGallery: readGallery(map.studio_gallery, DEFAULTS.studio_gallery),
    comingSoonImage: map.coming_soon_image || DEFAULTS.coming_soon_image,
  };
}

export async function setSetting(key, value) {
  await upsert.run(key, value);
}
