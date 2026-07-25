import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { config, ROOT } from "./config.js";
import { db } from "./db/index.js";
import publicRoutes from "./routes/public.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import wishlistRoutes from "./routes/wishlist.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.disable("x-powered-by");
if (config.trustProxy) app.set("trust proxy", 1);

// CORS for the split deployment (frontend on Vercel calls this API on Render).
// Auth is a Bearer token in a header (no cookies), so reflecting the request
// origin is safe; set CORS_ORIGINS to an allowlist to lock it down.
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin && (config.corsOrigins.length === 0 || config.corsOrigins.includes(origin))) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.set("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204); // preflight
  next();
});

// Global JSON body parser (small cap). The payment-proof route carries an image
// data URL, and the admin media uploader carries an image — both parse their
// own larger bodies, so skip them here.
app.use((req, res, next) => {
  if (req.path.endsWith("/payment-proof") || req.path === "/api/admin/media") return next();
  express.json({ limit: "32kb" })(req, res, next);
});

// Baseline security headers on everything; a strict CSP just for the
// dashboard (it's fully self-hosted, so 'self' is enough there — the main
// site keeps using Google Fonts and stays CSP-free).
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.set("X-Frame-Options", "DENY");
  // Force HTTPS for a year on this host + subdomains (Render terminates TLS).
  res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  if (req.path === "/admin" || req.path.startsWith("/admin/")) {
    res.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'"
    );
  }
  next();
});

// Compact request log for API traffic only (static noise stays out).
app.use((req, res, next) => {
  if (!req.path.startsWith("/api")) return next();
  const started = Date.now();
  res.on("finish", () => {
    console.log(`[api] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`);
  });
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api", publicRoutes);

// Owner dashboard — vanilla HTML/JS served straight from server/admin.
app.use("/admin", express.static(path.join(__dirname, "admin")));

// Product photos live in the repo (public/assets) — serve them from the API
// too so the admin dashboard's thumbnails work even when this runs
// backend-only (the Vercel frontend serves its own copy from the build).
app.use("/assets", express.static(path.join(ROOT, "public", "assets"), { maxAge: "1h" }));

// Serve the built site when dist/ exists (production single-process mode);
// in dev Vite serves the frontend and proxies /api + /admin here.
const distDir = path.join(ROOT, "dist");
if (fs.existsSync(path.join(distDir, "index.html"))) {
  app.use(express.static(distDir, { maxAge: "1h" }));
  // SPA fallback for client-side routes (/tees, /custom-print, ...)
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api") || req.path.startsWith("/admin")) {
      return next();
    }
    res.sendFile(path.join(distDir, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.json({
      ok: true,
      hint: "API server. Run `npm run build` to also serve the site from here, or use the Vite dev server for the frontend.",
    });
  });
}

// JSON 404 for unknown API routes.
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Final error handler — malformed JSON gets a 400, everything else a clean 500.
app.use((err, req, res, next) => {
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body too large" });
  }
  console.error("[error]", err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Something broke on our side — try again." });
});

const server = app.listen(config.port, () => {
  console.log(`[gunji] API running at http://localhost:${config.port}`);
  console.log(`[gunji] admin dashboard: http://localhost:${config.port}/admin`);
  if (!config.adminPassword) {
    console.warn("[gunji] WARNING: ADMIN_PASSWORD is not set — admin login is disabled. Add it to .env.");
  }
});

// Self-heartbeat — keeps the Render Free instance warm (see config.heartbeatUrl).
// Hits our own public /api/health through the platform edge so it counts as
// inbound traffic and resets the idle-spin-down timer. No-op when no URL is set.
if (config.heartbeatUrl) {
  const url = `${config.heartbeatUrl}/api/health`;
  const everyMs = config.heartbeatMinutes * 60 * 1000;
  console.log(`[gunji] heartbeat: pinging ${url} every ${config.heartbeatMinutes} min`);
  setInterval(() => {
    fetch(url, { signal: AbortSignal.timeout(15000) })
      .then((res) => { if (!res.ok) console.warn(`[heartbeat] ${res.status}`); })
      .catch((err) => console.warn(`[heartbeat] failed: ${err?.message || err}`));
  }, everyMs).unref(); // .unref so it never blocks a clean shutdown
}

function shutdown(signal) {
  console.log(`[gunji] ${signal} — shutting down`);
  server.close(() => {
    try {
      db.close();
    } catch {
      // already closed
    }
    process.exit(0);
  });
  // Don't hang forever on open keep-alive sockets.
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
