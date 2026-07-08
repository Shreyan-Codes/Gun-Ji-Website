import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { config } from "../config.js";
import { hashPassword } from "../lib/password.js";
import { preSchema, postSchema, tableExists } from "./migrate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

export const db = new DatabaseSync(config.dbPath);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

// If this DB file predates the new schema, back it up once before we touch it.
const needsMigration =
  fs.existsSync(config.dbPath) &&
  (tableExists(db, "customers") ||
    (tableExists(db, "products") && !hasColumn(db, "products", "slug")) ||
    (tableExists(db, "orders") && hasColumn(db, "orders", "item")));

if (needsMigration) {
  const backup = `${config.dbPath}.backup-${Date.now()}`;
  try {
    fs.copyFileSync(config.dbPath, backup);
    console.log(`[db] backed up old database → ${path.basename(backup)}`);
  } catch (err) {
    console.warn("[db] could not back up database:", err.message);
  }
}

function hasColumn(database, table, column) {
  return database.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
}

// 1) rename/drop legacy tables, 2) create the new schema, 3) copy data across.
preSchema(db);
db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
postSchema(db);

// ---------- boot-time seeding ----------

// Default site settings (only inserted if missing).
const defaultSettings = {
  whatsapp_number: "",
  ig_dm: "https://ig.me/m/gunji.clo1",
  ig_profile: "https://www.instagram.com/gunji.clo1/",
};
const seedSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
for (const [key, value] of Object.entries(defaultSettings)) seedSetting.run(key, value);

// The admin lives in `users` with role='admin'. Its password mirrors
// ADMIN_PASSWORD from .env and is refreshed on every boot, so changing the env
// value updates the login. Admin login stays disabled until it's set.
const ADMIN_EMAIL = "admin@gunji.local";
if (config.adminPassword) {
  const { hash, salt } = hashPassword(config.adminPassword);
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(ADMIN_EMAIL);
  if (existing) {
    db.prepare(
      "UPDATE users SET password_hash = ?, salt = ?, role = 'admin', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?"
    ).run(hash, salt, existing.id);
  } else {
    db.prepare(
      "INSERT INTO users (email, name, password_hash, salt, role) VALUES (?, 'Studio admin', ?, ?, 'admin')"
    ).run(ADMIN_EMAIL, hash, salt);
  }
}

export { ADMIN_EMAIL };

// Small manual-transaction helper — node:sqlite has no better-sqlite3-style
// db.transaction(). Rolls back and rethrows on error.
export function tx(fn) {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    try { db.exec("ROLLBACK"); } catch { /* already rolled back */ }
    throw err;
  }
}
