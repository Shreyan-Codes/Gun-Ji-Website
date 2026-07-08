import { db } from "./index.js";

// The /custom-print "send us your idea" inbox. Unchanged from the old schema.

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

const insert = db.prepare(
  `INSERT INTO custom_requests (name, contact, method, idea, colour, size, qty, reference_url)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);
const selectById = db.prepare("SELECT * FROM custom_requests WHERE id = ?");

export function customToJson(row) {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact,
    method: row.method,
    idea: row.idea,
    colour: row.colour,
    size: row.size,
    qty: row.qty,
    referenceUrl: row.reference_url,
    status: row.status,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createCustomRequest(f) {
  const info = insert.run(
    f.name, f.contact, f.method ?? "instagram", f.idea,
    f.colour ?? "", f.size ?? "", f.qty ?? 1, f.referenceUrl ?? ""
  );
  return customToJson(selectById.get(Number(info.lastInsertRowid)));
}

export function listCustomRequests(status) {
  const rows = status
    ? db.prepare("SELECT * FROM custom_requests WHERE status = ? ORDER BY id DESC").all(status)
    : db.prepare("SELECT * FROM custom_requests ORDER BY id DESC").all();
  return rows.map(customToJson);
}

const COL = { status: "status", adminNote: "admin_note" };

export function updateCustomRequest(id, patch) {
  const sets = [];
  const params = [];
  for (const [key, col] of Object.entries(COL)) {
    if (Object.hasOwn(patch, key)) { sets.push(`${col} = ?`); params.push(patch[key]); }
  }
  if (sets.length === 0) return selectById.get(id) ? customToJson(selectById.get(id)) : null;
  const info = db.prepare(`UPDATE custom_requests SET ${sets.join(", ")}, updated_at = ${NOW} WHERE id = ?`).run(...params, id);
  return info.changes > 0 ? customToJson(selectById.get(id)) : null;
}

export const deleteCustomRequest = (id) =>
  db.prepare("DELETE FROM custom_requests WHERE id = ?").run(id).changes > 0;
