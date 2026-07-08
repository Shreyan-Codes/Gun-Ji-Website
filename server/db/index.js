import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AsyncLocalStorage } from "node:async_hooks";
import pg from "pg";
import { config } from "../config.js";
import { hashPassword } from "../lib/password.js";

const { Pool, types } = pg;

// Parse PostgreSQL BIGINT (INT8) as integer in JavaScript
types.setTypeParser(types.builtins.INT8, (value) => parseInt(value, 10));

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create a connection pool to Supabase / PostgreSQL.
// In development, if DATABASE_URL is not set, it will fallback to local postgres defaults or we can log a warning.
if (!config.databaseUrl) {
  console.error("[db] ERROR: DATABASE_URL environment variable is not set!");
}

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseUrl.includes("supabase.co") || config.databaseUrl.includes("render.com")
    ? { rejectUnauthorized: false }
    : false,
});

const txStorage = new AsyncLocalStorage();

class Stmt {
  constructor(sqlStr) {
    this.sqlStr = sqlStr;
    // Translate SQLite style '?' placeholders to Postgres '$1, $2, ...'
    let count = 1;
    let sql = sqlStr.replace(/\?/g, () => `$${count++}`);
    
    // Convert strftime to CURRENT_TIMESTAMP
    sql = sql.replace(/strftime\([^)]+\)/g, "CURRENT_TIMESTAMP");

    // Handle SQLite specific "INSERT OR IGNORE" to Postgres "INSERT ... ON CONFLICT"
    if (/insert\s+or\s+ignore\s+into\s+settings/i.test(sql)) {
      sql = sql.replace(/insert\s+or\s+ignore\s+into\s+settings/i, "INSERT INTO settings");
      sql += " ON CONFLICT (key) DO NOTHING";
    } else if (/insert\s+or\s+ignore\s+into\s+users/i.test(sql)) {
      sql = sql.replace(/insert\s+or\s+ignore\s+into\s+users/i, "INSERT INTO users");
      sql += " ON CONFLICT (email) DO NOTHING";
    }

    // Append RETURNING id or RETURNING * to INSERT queries to get lastInsertRowid
    this.isInsert = /^\s*insert\s+/i.test(sql);
    if (this.isInsert && !/returning/i.test(sql)) {
      sql += " RETURNING id";
    }

    this.translatedSql = sql;
  }

  async get(...params) {
    const actualParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const txClient = txStorage.getStore();
    const executor = txClient || pool;
    const result = await executor.query(this.translatedSql, actualParams);
    return result.rows[0] || null;
  }

  async all(...params) {
    const actualParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const txClient = txStorage.getStore();
    const executor = txClient || pool;
    const result = await executor.query(this.translatedSql, actualParams);
    return result.rows;
  }

  async run(...params) {
    const actualParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const txClient = txStorage.getStore();
    const executor = txClient || pool;
    const result = await executor.query(this.translatedSql, actualParams);
    return {
      lastInsertRowid: result.rows[0]?.id || null,
      changes: result.rowCount,
    };
  }
}

export const db = {
  prepare(sql) {
    return new Stmt(sql);
  },
  async exec(sqlStr) {
    const txClient = txStorage.getStore();
    const executor = txClient || pool;
    let sql = sqlStr.replace(/strftime\([^)]+\)/g, "CURRENT_TIMESTAMP");
    await executor.query(sql);
  },
  async close() {
    await pool.end();
  }
};

// Initialize schema
try {
  const schemaSql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await db.exec(schemaSql);
  console.log("[db] schema initialized successfully");
} catch (err) {
  console.error("[db] schema initialization failed:", err.message);
}

// ---------- boot-time seeding ----------

const defaultSettings = {
  whatsapp_number: "",
  ig_dm: "https://ig.me/m/gunji.clo1",
  ig_profile: "https://www.instagram.com/gunji.clo1/",
};

// Seed default settings
const seedSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING");
for (const [key, value] of Object.entries(defaultSettings)) {
  await seedSetting.run(key, value);
}

const ADMIN_EMAIL = "admin@gunji.local";
if (config.adminPassword) {
  const { hash, salt } = hashPassword(config.adminPassword);
  const existing = await db.prepare("SELECT id FROM users WHERE email = ?").get(ADMIN_EMAIL);
  if (existing) {
    await db.prepare(
      "UPDATE users SET password_hash = ?, salt = ?, role = 'admin', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(hash, salt, existing.id);
  } else {
    await db.prepare(
      "INSERT INTO users (email, name, password_hash, salt, role) VALUES (?, 'Studio admin', ?, ?, 'admin')"
    ).run(ADMIN_EMAIL, hash, salt);
  }
}

export { ADMIN_EMAIL };

// Transaction Helper using AsyncLocalStorage
export async function tx(fn) {
  const existingClient = txStorage.getStore();
  if (existingClient) {
    return await fn();
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await txStorage.run(client, async () => {
      return await fn();
    });
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // already rolled back
    }
    throw err;
  } finally {
    client.release();
  }
}
