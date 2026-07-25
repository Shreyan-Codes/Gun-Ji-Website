import { db } from "./index.js";

const insert = db.prepare(
  "INSERT INTO site_media (mime_type, data) VALUES (?, ?) RETURNING id"
);
const select = db.prepare(
  "SELECT id, mime_type, data FROM site_media WHERE id = ?"
);

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 6 * 1024 * 1024;

export async function saveMediaDataUrl(dataUrl) {
  const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/.exec(
    String(dataUrl || "")
  );
  if (!match || !ALLOWED.has(match[1])) {
    throw new Error("Use a JPG, PNG, WebP or GIF image");
  }
  const data = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!data.length || data.length > MAX_BYTES) {
    throw new Error("Image must be smaller than 6 MB");
  }
  const row = await insert.get(match[1], data);
  return { id: row.id, url: `/api/media/${row.id}` };
}

export async function getMedia(id) {
  return select.get(id);
}
