import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Minimal numbered-migration runner. Applies un-applied server/db/migrations/
// *.sql files in filename order, once each, tracked in schema_migrations.
// Never edit an applied migration — always add a new numbered file.
//
// Runs at boot after schema.sql. Non-fatal: a failing migration is logged and
// stops the run (so later migrations don't apply out of order) without crashing
// the API. Migration SQL must be idempotent (see 001).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

export async function runMigrations(db) {
  if (!fs.existsSync(MIGRATIONS_DIR)) return;

  await db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())"
  );

  const appliedRows = await db.prepare("SELECT filename FROM schema_migrations").all();
  const applied = new Set(appliedRows.map((r) => r.filename));

  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    try {
      await db.exec(sql);
      await db.prepare("INSERT INTO schema_migrations (filename) VALUES (?)").run(file);
      console.log(`[db] migration applied: ${file}`);
    } catch (err) {
      console.error(`[db] migration FAILED (${file}): ${err.message}`);
      break;
    }
  }
}
