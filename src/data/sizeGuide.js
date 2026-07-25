// Single source of truth for every customer-facing size picker and size chart.
// Exact garment measurements have not been confirmed for the current batch, so
// keep them blank rather than showing made-up measurements.

export const T_SHIRT_SIZES = ["S", "M", "L"];

export const SIZE_ROWS = [
  { size: "S", chest: "—", length: "—", shoulder: "—", sleeve: "—" },
  { size: "M", chest: "—", length: "—", shoulder: "—", sleeve: "—" },
  { size: "L", chest: "—", length: "—", shoulder: "—", sleeve: "—" },
];

export const MEASURE_TIPS = [
  ["Chest", "measure flat across, one armpit to the other, then double it."],
  ["Length", "from the highest shoulder point straight down to the hem."],
  ["Shoulder", "seam to seam across the back."],
  ["Sleeve", "from the shoulder seam to the sleeve opening."],
];
