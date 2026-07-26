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
      // The Apps Script has to be deployed as "Anyone" to accept an anonymous
      // POST, so a shared token is what actually authorises the append.
      token: config.sheetsWebhookToken,
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

// Column order is the sheet's contract — only ever append new columns on the
// end, otherwise existing rows shift under their headers.
export const ORDER_HEADERS = [
  "Time", "Order #", "Tracking", "Name", "Phone", "Items",
  "Subtotal (Rs.)", "Coupon", "Discount (Rs.)", "Total (Rs.)",
  "Payment", "Address", "Map pin", "Status",
];

export function orderToRow(order) {
  const items = (order.items || [])
    .map((i) => `${i.qty}× ${i.item} (${i.size}${i.colour ? "/" + i.colour : ""})`)
    .join(", ");
  return [
    order.createdAt || new Date().toISOString(),
    order.id,
    order.trackingCode || "",
    order.shippingName || order.name || "",
    // Checkout is phone-only now, so `contact` mirrors it; fall back for older
    // rows and for manual orders created in /admin with a handle instead.
    order.shippingPhone || order.contact || "",
    items,
    Number(order.subtotal || order.total || 0),
    order.couponCode || "",
    Number(order.discount || 0),
    Number(order.total || 0),
    order.paymentMethod || "",
    order.shippingAddress || "",
    order.locationUrl || "",
    order.status || "pending",
  ];
}

export function logOrderToSheet(order) {
  postToSheet({ sheet: "Orders", headers: ORDER_HEADERS, row: orderToRow(order) });
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
