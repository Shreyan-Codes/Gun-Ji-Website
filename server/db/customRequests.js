import { db } from "./index.js";

// The /custom-print "send us your idea" inbox. Unchanged from the old schema.

const insert = db.prepare(
  `INSERT INTO custom_requests (name, contact, method, idea, colour, size, qty, reference_url)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);
const selectById = db.prepare("SELECT * FROM custom_requests WHERE id = ?");

export function customToJson(row) {
  if (!row) return null;
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

export async function createCustomRequest(f) {
  const info = await insert.run(
    f.name, f.contact, f.method ?? "instagram", f.idea,
    f.colour ?? "", f.size ?? "", f.qty ?? 1, f.referenceUrl ?? ""
  );
  return customToJson(await selectById.get(Number(info.lastInsertRowid)));
}

export async function listCustomRequests(status) {
  const stmt = status
    ? db.prepare("SELECT * FROM custom_requests WHERE status = ? ORDER BY id DESC")
    : db.prepare("SELECT * FROM custom_requests ORDER BY id DESC");
  const rows = status ? await stmt.all(status) : await stmt.all();
  return rows.map(customToJson);
}

const COL = { status: "status", adminNote: "admin_note" };

export async function updateCustomRequest(id, patch) {
  const sets = [];
  const params = [];
  for (const [key, col] of Object.entries(COL)) {
    if (Object.hasOwn(patch, key)) { sets.push(`${col} = ?`); params.push(patch[key]); }
  }
  if (sets.length === 0) {
    const existing = await selectById.get(id);
    return existing ? customToJson(existing) : null;
  }
  const info = await db.prepare(`UPDATE custom_requests SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...params, id);
  if (info.changes > 0) {
    const row = await selectById.get(id);
    return row ? customToJson(row) : null;
  }
  return null;
}

export async function deleteCustomRequest(id) {
  const info = await db.prepare("DELETE FROM custom_requests WHERE id = ?").run(id);
  return info.changes > 0;
}
