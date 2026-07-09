import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Project root (one level above server/)
export const ROOT = path.resolve(__dirname, "..");

// Load .env if present (built into Node 21.7+, no dotenv needed)
try {
  process.loadEnvFile(path.join(ROOT, ".env"));
} catch {
  // no .env — rely on real environment variables
}

const posInt = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const config = {
  // API_PORT wins over PORT: dev tooling (Vite preview harnesses etc.) often
  // injects PORT for the *frontend*, which must not drag the API onto it.
  // On a bare host/PaaS that provides only PORT, that still works.
  port: posInt(process.env.API_PORT, posInt(process.env.PORT, 3001)),
  // Password for the /admin dashboard. Login is disabled until this is set.
  adminPassword: process.env.ADMIN_PASSWORD || "",
  sessionTtlMs: posInt(process.env.SESSION_TTL_HOURS, 12) * 60 * 60 * 1000,
  // Customer logins last longer than admin ones (they're low-privilege).
  customerSessionTtlMs: posInt(process.env.CUSTOMER_SESSION_TTL_DAYS, 30) * 24 * 60 * 60 * 1000,
  // Google "Sign in with Google" — paste your OAuth Client ID here (public,
  // safe to expose). Google sign-in stays hidden until this is set.
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  // Allowed browser origins for cross-origin API calls (the Vercel frontend
  // calling this Render backend). Comma-separated. Empty = reflect any origin
  // (fine here since auth is Bearer-token, not cookies) — set it to lock down.
  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  dbPath: process.env.DB_PATH
    ? path.resolve(ROOT, process.env.DB_PATH)
    : path.join(ROOT, "data", "gunji.db"),
  databaseUrl: process.env.DATABASE_URL || "",
  // Telegram owner-alerts (new order / custom request). Both must be set to
  // enable; otherwise notifications are silently skipped.
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
  // Google Apps Script web-app webhook URL that appends orders/requests to a
  // Google Sheet. Empty = skip. Set as a secret in the Render dashboard.
  sheetsWebhookUrl: process.env.GSHEET_WEBHOOK_URL || "",
  // Set TRUST_PROXY=1 when running behind nginx/caddy so rate limits see real IPs.
  trustProxy: process.env.TRUST_PROXY === "1",
};
