import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGallery } from "./gallery.js";

const label = "Photo studio gallery";

test("normalizes valid local and HTTPS studio photos", () => {
  const result = normalizeGallery(
    {
      studioGallery: [
        { src: " /assets/model-1.jpg ", alt: " Model in a tee ", cap: " Look one " },
        { src: "https://images.example.com/model-2.webp", alt: "", cap: "" },
      ],
    },
    "studioGallery",
    label
  );

  assert.deepEqual(result.items, [
    { src: "/assets/model-1.jpg", alt: "Model in a tee", cap: "Look one" },
    { src: "https://images.example.com/model-2.webp", alt: "", cap: "" },
  ]);
});

test("allows an omitted gallery during partial settings updates", () => {
  assert.deepEqual(normalizeGallery({}, "studioGallery", label), { items: null });
});

test("rejects empty, duplicate, and unsafe studio galleries", () => {
  assert.match(normalizeGallery({ studioGallery: [] }, "studioGallery", label).error, /1–12/);
  assert.match(
    normalizeGallery(
      { studioGallery: [{ src: "/same.jpg" }, { src: "/same.jpg" }] },
      "studioGallery",
      label
    ).error,
    /same photo twice/
  );
  assert.match(
    normalizeGallery({ studioGallery: [{ src: "http://example.com/model.jpg" }] }, "studioGallery", label).error,
    /photo paths/
  );
});
