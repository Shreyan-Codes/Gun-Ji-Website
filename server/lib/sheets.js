import { config } from "../config.js";

// Appends new orders / custom-print requests as rows to a Google Sheet, via a
// Google Apps Script web-app webhook bound to that sheet. No service-account
// keys needed — the backend just POSTs JSON. Fire-and-forget; silently no-ops
// until GSHEET_WEBHOOK_URL is set, so orders never fail if it's unconfigured.

// Google Sheets treats strings beginning with these characters as formulas.
// Prefix customer-controlled values with an apostrophe so a name, address or
// custom-print idea can never execute when the webhook appends the row.
const safeSheetCell = (value) =>
  typeof value === "string" && /^\s*[=+\-@]/.test(value) ? `'${value}` : value;

async function postToSheet(payload) {
  const url = config.sheetsWebhookUrl;
  if (!url) return; // not configured — skip quietly
  try {
    const safePayload = {
      ...payload,
      row: Array.isArray(payload.row) ? payload.row.map(safeSheetCell) : payload.row,
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safePayload),
      redirect: "follow", // Apps Script bounces through a 302
    });
    if (!res.ok) console.error("[sheets] append failed:", res.status);
  } catch (err) {
    console.error("[sheets] append error:", err.message);
  }
}

export function logOrderToSheet(order) {
  const items = (order.items || [])
    .map((i) => `${i.qty}× ${i.item} (${i.size}${i.colour ? "/" + i.colour : ""})`)
    .join(", ");
  postToSheet({
    sheet: "Orders",
    headers: ["Time", "Order #", "Name", "Method", "Contact", "Items", "Subtotal (Rs.)", "Coupon", "Discount (Rs.)", "Total (Rs.)", "Address", "Map pin", "Status"],
    row: [
      new Date().toISOString(),
      order.id,
      order.shippingName || order.name || "",
      order.method || "",
      order.contact || "",
      items,
      Number(order.subtotal || order.total || 0),
      order.couponCode || "",
      Number(order.discount || 0),
      Number(order.total || 0),
      order.shippingAddress || "",
      order.locationUrl || "",
      order.status || "pending",
    ],
  });
}

export function logCustomRequestToSheet(cr) {
  postToSheet({
    sheet: "Custom Requests",
    headers: ["Time", "Request #", "Name", "Method", "Contact", "Idea", "Qty", "Size", "Colour", "Reference"],
    row: [
      new Date().toISOString(),
      cr.id,
      cr.name || "",
      cr.method || "",
      cr.contact || "",
      cr.idea || "",
      cr.qty || "",
      cr.size || "",
      cr.colour || "",
      cr.referenceUrl || "",
    ],
  });
}
