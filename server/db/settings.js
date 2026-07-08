import { db } from "./index.js";

const DEFAULTS = {
  ig_dm: "https://ig.me/m/gunji.clo1",
  ig_profile: "https://www.instagram.com/gunji.clo1/",
};

const selectAll = db.prepare("SELECT key, value FROM settings");
const upsert = db.prepare(
  "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
);

export function getSettings() {
  const map = Object.fromEntries(selectAll.all().map((r) => [r.key, r.value]));
  return {
    whatsappNumber: map.whatsapp_number ?? "",
    igDm: map.ig_dm || DEFAULTS.ig_dm,
    igProfile: map.ig_profile || DEFAULTS.ig_profile,
  };
}

export function setSetting(key, value) {
  upsert.run(key, value);
}
