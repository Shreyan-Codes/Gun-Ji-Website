# Order spreadsheet

Every new order and custom-print request is appended as a row to a Google Sheet,
so orders can be managed outside `/admin`.

**Sheet:** GUN-जी — Orders
<https://docs.google.com/spreadsheets/d/1Rv7QmMXmjzeYDcJKx4-BGWZtH86MoLW_dMQE_Qo1drE/edit>
(owned by `shreyanppandey7@gmail.com`)

## How it works

`server/lib/sheets.js` POSTs a small JSON payload to a Google Apps Script web
app bound to that spreadsheet, which appends the row. No service-account keys,
no Google API credentials on the server — just a URL and a shared token.

It is fire-and-forget: if the webhook is unset, slow or failing, the order still
completes. A failed append is logged as `[sheets] append failed` and never
surfaces to the customer.

Two tabs are created automatically on first write:

| Tab | Written by |
| --- | --- |
| `Orders` | every completed checkout |
| `Custom Requests` | every custom-print enquiry |

`Orders` columns, in order:

`Time · Order # · Tracking · Name · Phone · Items · Subtotal (Rs.) · Coupon · Discount (Rs.) · Total (Rs.) · Payment · Address · Map pin · Status`

Only ever append new columns to the **end** of `ORDER_HEADERS` — inserting one
in the middle shifts every existing row out from under its header.

## Setup (one time)

1. Open the sheet → **Extensions → Apps Script**.
2. Replace the placeholder `Code.gs` with [`scripts/gsheet-webhook.gs`](../scripts/gsheet-webhook.gs). Save.
3. Set `SHARED_TOKEN` at the top of the script to a long random string.
4. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Authorise when prompted, then copy the `/exec` URL.
6. In the **Render dashboard** (backend env vars), set:
   ```
   GSHEET_WEBHOOK_URL=<the /exec URL>
   GSHEET_WEBHOOK_TOKEN=<the same string as SHARED_TOKEN>
   ```
7. Redeploy the backend, then place a test order and confirm a row lands.

Paste the `/exec` URL into a browser to check the deployment is live — it should
return `{"ok":true,"service":"gunji-sheet-webhook"}`.

> **"Who has access: Anyone" is required** — Render posts anonymously, so a
> Google login can't be involved. That makes the URL itself a capability:
> anyone who learns it could append rows. `SHARED_TOKEN` is what actually
> authorises the write, so don't leave it empty and don't commit the URL.

### After editing the script

Save is not enough. **Deploy → Manage deployments →** edit the existing
deployment → **Version: New version**. Otherwise the old code keeps serving.

## Backfilling existing orders

The logger only fires on *new* orders, so the sheet starts empty. To push the
orders already in the database:

```bash
node scripts/backfill-sheet.js          # dry run, prints the rows
node scripts/backfill-sheet.js --send   # actually append
```

Run it **once** — the webhook appends unconditionally, so a second `--send`
duplicates every row. Clear the tab first if you need to re-run.

## Known gap

Rows are a snapshot at the moment the order was placed. Changing an order's
status in `/admin` afterwards does **not** update its row — the `Status` column
will still read `pending`. `/admin` remains the source of truth for live status;
the sheet is a log and a place to work offline.
