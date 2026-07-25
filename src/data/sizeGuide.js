// Single source of truth for every customer-facing size picker and size chart.
// These rounded reference measurements follow a common unisex classic-fit tee.
// They are not batch-specific measurements for GUN-JI garments.

export const T_SHIRT_SIZES = ["S", "M", "L"];

export const SIZE_ROWS = [
  { size: "S", chestWidth: 46, length: 71 },
  { size: "M", chestWidth: 51, length: 74 },
  { size: "L", chestWidth: 56, length: 76 },
];

export const MEASURE_TIPS = [
  ["Chest width", "lay the t-shirt flat and measure from armpit to armpit. Do not double it."],
  ["Length", "from the highest shoulder point straight down to the hem."],
];
