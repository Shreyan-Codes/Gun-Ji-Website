/**
 * GUN-जी — Google Sheet order log (Apps Script web app).
 *
 * Receives the JSON that server/lib/sheets.js POSTs on every new order and
 * custom-print request, and appends it as a row. Creates the tab and writes the
 * header row automatically the first time it sees a new `sheet` name, so there
 * is nothing to set up inside the spreadsheet by hand.
 *
 * ── Install ────────────────────────────────────────────────────────────────
 *  1. Open the spreadsheet → Extensions → Apps Script.
 *  2. Delete the placeholder Code.gs contents, paste this file, Save.
 *  3. Set SHARED_TOKEN below to a long random string.
 *  4. Deploy → New deployment → type "Web app".
 *       Execute as:      Me
 *       Who has access:  Anyone            <- required; Render posts anonymously
 *  5. Authorise when prompted, then copy the /exec URL.
 *  6. Put both values in the backend environment (Render dashboard):
 *       GSHEET_WEBHOOK_URL=<the /exec URL>
 *       GSHEET_WEBHOOK_TOKEN=<the same string as SHARED_TOKEN>
 *
 * After editing this script you must Deploy → Manage deployments → edit the
 * existing deployment → Version: New version. Saving alone does not publish.
 *
 * ── Why the token ──────────────────────────────────────────────────────────
 * "Who has access: Anyone" is the only setting that lets the backend post
 * without a Google login, which means anyone who learns the URL could append
 * rows. The shared token makes a leaked URL useless on its own. Leave
 * SHARED_TOKEN empty only if you accept that risk.
 */

var SHARED_TOKEN = "";  // must match GSHEET_WEBHOOK_TOKEN on the server

function doPost(e) {
  // Serialise appends — two orders landing at once would otherwise race for
  // the same row.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json({ ok: false, error: "busy" });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: "empty body" });
    }

    var payload = JSON.parse(e.postData.contents);

    if (SHARED_TOKEN && payload.token !== SHARED_TOKEN) {
      return json({ ok: false, error: "unauthorised" });
    }

    var tabName = payload.sheet || "Orders";
    var headers = payload.headers || [];
    var row = payload.row || [];
    if (!row.length) return json({ ok: false, error: "no row" });

    var book = SpreadsheetApp.getActiveSpreadsheet();
    var tab = book.getSheetByName(tabName) || book.insertSheet(tabName);

    // First write into a fresh tab lays down the header row and freezes it.
    if (tab.getLastRow() === 0 && headers.length) {
      tab.appendRow(headers);
      tab.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      tab.setFrozenRows(1);
    }

    tab.appendRow(row);

    // Keep the newest order readable without manual column dragging.
    if (headers.length) tab.autoResizeColumns(1, Math.min(headers.length, 20));

    return json({ ok: true, row: tab.getLastRow() });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// A GET is handy for checking the deployment is live in a browser.
function doGet() {
  return json({ ok: true, service: "gunji-sheet-webhook" });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
