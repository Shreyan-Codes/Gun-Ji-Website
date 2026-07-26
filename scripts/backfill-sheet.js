// One-off backfill: pushes every order already in the database into the Google
// Sheet. The live logger only fires on new orders, so without this the sheet
// starts empty and history stays invisible.
//
//   node scripts/backfill-sheet.js            # dry run — prints, sends nothing
//   node scripts/backfill-sheet.js --send     # actually append
//
// Needs DATABASE_URL, GSHEET_WEBHOOK_URL and GSHEET_WEBHOOK_TOKEN in the
// environment. Safe to re-run only if you clear the tab first — the webhook
// appends unconditionally, so a second --send duplicates every row.

import { config } from "../server/config.js";
import { adminListOrders } from "../server/db/orders.js";
import { ORDER_HEADERS, orderToRow } from "../server/lib/sheets.js";

const send = process.argv.includes("--send");

async function main() {
  if (!config.sheetsWebhookUrl) {
    console.error("[backfill] GSHEET_WEBHOOK_URL is not set — nothing to post to.");
    process.exit(1);
  }

  const orders = await adminListOrders();
  // Oldest first so the sheet reads chronologically top to bottom.
  orders.reverse();
  console.log(`[backfill] ${orders.length} order(s) found`);

  if (!send) {
    console.log(`[backfill] DRY RUN — re-run with --send to append.\n`);
    console.log(ORDER_HEADERS.join(" | "));
    for (const o of orders) console.log(orderToRow(o).join(" | "));
    process.exit(0);
  }

  let done = 0;
  for (const order of orders) {
    const res = await fetch(config.sheetsWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      redirect: "follow",
      body: JSON.stringify({
        sheet: "Orders",
        headers: ORDER_HEADERS,
        row: orderToRow(order),
        token: config.sheetsWebhookToken,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.ok === false) {
      console.error(`[backfill] order #${order.id} failed:`, res.status, body.error || "");
    } else {
      done++;
    }
    // Apps Script serialises on a lock; don't hammer it.
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`[backfill] appended ${done}/${orders.length}`);
  process.exit(done === orders.length ? 0 : 1);
}

main().catch((err) => {
  console.error("[backfill] error:", err);
  process.exit(1);
});
