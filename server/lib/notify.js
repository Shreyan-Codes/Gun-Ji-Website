import { config } from "../config.js";

// Fire-and-forget owner alerts via a Telegram bot. No-ops (silently) until both
// TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set, so orders never fail if
// notifications aren't configured or Telegram is unreachable.

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rupees = (n) => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;

async function sendTelegram(text) {
  const token = config.telegramBotToken;
  const chatId = config.telegramChatId;
  if (!token || !chatId) return; // not configured — skip quietly
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) console.error("[telegram] send failed:", res.status, await res.text());
  } catch (err) {
    console.error("[telegram] send error:", err.message);
  }
}

export function notifyNewOrder(order) {
  const lines = (order.items || [])
    .map((i) => `• ${i.qty}× ${esc(i.item)} <i>(${esc(i.size)}${i.colour ? " / " + esc(i.colour) : ""})</i>`)
    .join("\n");
  const parts = [
    `🛒 <b>New order #${order.id}</b>`,
    `${esc(order.shippingName || order.name)} — ${esc(order.method)}: ${esc(order.contact)}`,
    lines,
    `<b>Total: ${rupees(order.total)}</b>`,
  ];
  if (order.shippingAddress) parts.push(`🏠 ${esc(order.shippingAddress)}`);
  if (order.locationUrl) parts.push(`📍 <a href="${esc(order.locationUrl)}">Open delivery pin</a>`);
  sendTelegram(parts.filter(Boolean).join("\n"));
}

// Forwards an eSewa payment screenshot (data URL) to the owner as a Telegram
// photo. Fire-and-forget; no-ops if Telegram or the image is missing/invalid.
export async function notifyPaymentProof(orderId, dataUrl) {
  const token = config.telegramBotToken;
  const chatId = config.telegramChatId;
  if (!token || !chatId) return;
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl || "");
  if (!m) return;
  try {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append("caption", `💸 Payment screenshot — order #${orderId}`);
    form.append("photo", new Blob([Buffer.from(m[2], "base64")], { type: m[1] }), `order-${orderId}`);
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: "POST", body: form });
    if (!res.ok) console.error("[telegram] sendPhoto failed:", res.status, await res.text());
  } catch (err) {
    console.error("[telegram] sendPhoto error:", err.message);
  }
}

export function notifyNewCustomRequest(cr) {
  const parts = [
    `🎨 <b>New custom-print request #${cr.id}</b>`,
    `${esc(cr.name)} — ${esc(cr.method)}: ${esc(cr.contact)}`,
    `Idea: ${esc(cr.idea)}`,
    `Qty ${cr.qty}${cr.size ? " · " + esc(cr.size) : ""}${cr.colour ? " · " + esc(cr.colour) : ""}`,
  ];
  if (cr.referenceUrl) parts.push(`Ref: ${esc(cr.referenceUrl)}`);
  sendTelegram(parts.join("\n"));
}
