export function normalizeGallery(body, key, label) {
  if (!Object.hasOwn(body, key)) return { items: null };
  if (!Array.isArray(body[key]) || body[key].length < 1 || body[key].length > 12) {
    return { error: `${label} needs 1–12 photos` };
  }

  const items = body[key].map((item) => ({
    src: String(item?.src || "").trim(),
    alt: String(item?.alt || "").trim(),
    cap: String(item?.cap || "").trim(),
  }));
  const invalidPhoto = items.find(
    (item) =>
      !/^(?:\/(?!\/)|https:\/\/)/.test(item.src) ||
      item.src.length > 1000 ||
      item.alt.length > 300 ||
      item.cap.length > 120
  );
  if (invalidPhoto) return { error: `Check the ${label.toLowerCase()} photo paths and text` };
  if (new Set(items.map((item) => item.src)).size !== items.length) {
    return { error: `${label} cannot use the same photo twice` };
  }
  return { items };
}
