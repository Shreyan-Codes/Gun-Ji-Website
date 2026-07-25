// Single source of truth for the size chart — rendered both on /size-guide and
// inline on the product page, so the two can never drift apart.
// Garment measurements are a general fit guide and may vary slightly by batch.

export const SIZE_ROWS = [
  { size: "XL", chest: 60, length: 74, shoulder: 58, sleeve: 25 },
  { size: "XXL", chest: 62, length: 76, shoulder: 60, sleeve: 26 },
  { size: "XXXL", chest: "—", length: "—", shoulder: "—", sleeve: "—" },
];

export const MEASURE_TIPS = [
  ["Chest", "measure flat across, one armpit to the other, then double it."],
  ["Length", "from the highest shoulder point straight down to the hem."],
  ["Shoulder", "seam to seam across the back."],
  ["Sleeve", "from the shoulder seam to the sleeve opening."],
];
