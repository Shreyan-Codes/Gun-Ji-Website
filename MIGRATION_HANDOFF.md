# Migration Handoff — SQLite → PostgreSQL (Supabase)

This document explains all changes made so far and what remains, so any AI assistant or developer can pick up where we left off.

**Last updated:** 2026-07-08 — Cursor (continued from Antigravity)

---

## Goal

Migrate the GUN-जी backend from **SQLite** (`node:sqlite` / `DatabaseSync`) to **PostgreSQL** (hosted on **Supabase free tier**) so the Express backend can run on **Render's free plan** (which has no persistent disk — SQLite data would be wiped on every restart).

The **Vercel frontend** is already deployed at **https://gunji.vercel.app**. Once the backend is live on Render, we set `VITE_API_URL` in the Vercel project settings to the Render URL and redeploy.

---

## What Has Been Changed (completed so far)

### 1. `package.json` — added `pg` dependency
- Ran `npm install pg` to add the PostgreSQL driver.

### 2. `server/config.js` — added `databaseUrl`
- Added `databaseUrl: process.env.DATABASE_URL || ""` to the exported config object.
- The rest of the config (including legacy `dbPath`) is untouched.

### 3. `server/db/schema.sql` — rewritten for PostgreSQL
- `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`
- `strftime('%Y-%m-%dT%H:%M:%fZ','now')` defaults → `TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`
- `FOREIGN KEY` declarations moved inline (PostgreSQL style: `REFERENCES table(col) ON DELETE ...`)
- All `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` preserved.

### 4. `server/db/index.js` — complete rewrite (PostgreSQL adapter)
- Replaced `node:sqlite` `DatabaseSync` with a `pg.Pool` connection.
- Built a **compatibility layer** (`Stmt` class) that mimics the old SQLite API:
  - `db.prepare(sql)` returns a `Stmt` with `.get()`, `.all()`, `.run()` — all now **async**.
  - `?` placeholders are auto-translated to `$1, $2, ...` at prepare time.
  - `strftime(...)` calls are replaced with `CURRENT_TIMESTAMP`.
  - `INSERT OR IGNORE INTO settings` is translated to `INSERT ... ON CONFLICT (key) DO NOTHING`.
  - All `INSERT` statements get `RETURNING id` appended automatically (to emulate `lastInsertRowid`).
- `db.exec(sql)` runs raw SQL (used for schema init).
- **Transaction helper** `tx(fn)` uses `AsyncLocalStorage` so that all `db.prepare()` calls inside a `tx()` callback automatically use the same PostgreSQL client/transaction.
- Schema is initialized on import (top-level `await`).
- Boot-time seeding of default settings and the admin user is done at module load (async, top-level `await`).
- SSL is auto-enabled for Supabase/Render connection strings.

### 5. `server/db/migrate.js` — DELETED
- The old SQLite-to-SQLite migration helper is no longer needed.

### 6. `server/db/users.js` — converted to async
- All exported functions (`findUserById`, `findUserByEmail`, `findUserByGoogleId`, `findAdmin`, `createUser`, `attachGoogle`) are now `async` and `await` the database calls.
- `userToJson` remains synchronous (it's a pure data transform, no DB calls).

### 7. `server/db/sessions.js` — converted to async
- `createSession`, `destroySession`, `userForToken`, `pruneSessions` are all `async`.
- The `setInterval` for hourly session pruning now calls `pruneSessions().catch(...)`.

### 8. `server/db/settings.js` — converted to async
- `getSettings` and `setSetting` are now `async`.

### 9. `server/db/products.js` — converted to async
- All functions are `async`: `productToJson`, `listActiveProducts`, `listAllProducts`, `getProduct`, `getProductRow`, `createProduct`, `updateProduct`, `setProductActive`, `deleteProduct`, `addImage`, `deleteImage`, `setPrimaryImage`, `findVariant`, `getVariantById`, `getVariantWithProduct`, `addVariant`, `setVariantStock`, `decrementStock`.
- `productToJson` now awaits image and variant queries.

### 10. `server/db/orders.js` — converted to async
- All functions are `async`: `orderToJson`, `getOrder`, `createOrder`, `listOrdersByUser`, `adminListOrders`, `updateOrder`, `deleteOrder`.
- `createOrder` uses `tx(async () => { ... })` for transactional stock decrement.

### 11. `server/db/customRequests.js` — converted to async
- All functions are `async`: `createCustomRequest`, `listCustomRequests`, `updateCustomRequest`, `deleteCustomRequest`.
- `customToJson` remains synchronous.

### 12. `server/db/seed.js` — converted to async
- Wrapped in an `async function runSeed()` with a `.catch()` error handler.
- Uses `for...of` loop instead of `.forEach` for sequential async product creation.

### 13. `server/lib/authMiddleware.js` — made async ✅ (Cursor, 2026-07-08)
- `requireCustomer`, `optionalCustomer`, `requireAdmin` are now `async (req, res, next)`.
- Each `await`s `userForToken(bearer(req))` before proceeding.

### 14. `server/routes/auth.js` — made async ✅ (Cursor, 2026-07-08)
- All route handlers that touch the DB are now `async`.
- `issue()` helper is `async` and `await`s `createSession`.
- Signup, login, google, logout, and orders routes all `await` DB calls.

### 15. `server/routes/public.js` — made async ✅ (Cursor, 2026-07-08)
- Health, settings, products, product detail, orders (cart + single), and custom-requests routes are all `async`.
- `placeCartOrder` and `placeSingleOrder` helpers are `async`.

### 16. `server/routes/admin.js` — made async ✅ (Cursor, 2026-07-08)
- All admin route handlers are `async`, including `/stats` which now `await`s `db.prepare(...).all()` and `.get()`.
- Login, logout, orders CRUD, custom requests CRUD, products CRUD, and settings all `await` DB calls.

### 17. `render.yaml` — updated for free tier ✅ (Cursor, 2026-07-08)
- Changed `plan: starter` → `plan: free`.
- Removed the `disk:` section entirely (no persistent disk on free tier).
- Removed `DB_PATH` env var (no longer using SQLite file path).
- Added `DATABASE_URL` env var (`sync: false` — set as secret in Render dashboard).

### 18. `.env.example` — updated for PostgreSQL ✅ (Cursor, 2026-07-08)
- Replaced `DB_PATH` comment with `DATABASE_URL` (Supabase Session pooler example).

---

## What Still Needs To Be Done

### 19. Commit and push to GitHub
- **Status:** All code changes are local and **uncommitted** (as of 2026-07-08).
- Remote: `https://github.com/Shreyan-Codes/Gun-Ji-Website.git`, branch `main`.
- Files changed: see git status — migration touches `server/db/*`, routes, `render.yaml`, `package.json`, `.env.example`, `MIGRATION_HANDOFF.md`, etc.
- **Action:** Stage, commit, and push so Render can auto-deploy from the blueprint.

Suggested commit message:
```
Migrate backend from SQLite to PostgreSQL for Render free tier
```

### 20. Set up Supabase (if not done yet)
- Create a free Supabase project at https://supabase.com
- Go to **Project Settings → Database → Connection string**
- Copy the **Session pooler** URI (port 6543, recommended for serverless/pooled connections)
- The schema is applied automatically by `server/db/index.js` on first boot — no manual SQL migration needed

### 21. Deploy to Render
- Go to https://dashboard.render.com
- **New → Blueprint** (or update existing `gunji-api` service)
- Connect the GitHub repo `Shreyan-Codes/Gun-Ji-Website`
- Render reads `render.yaml` from the repo root
- Set these **secret** environment variables in the Render dashboard:
  - `DATABASE_URL` — Supabase Session pooler connection string
  - `ADMIN_PASSWORD` — pick a long random password for `/admin`
  - `CORS_ORIGINS` — `https://gunji.vercel.app`
  - `GOOGLE_CLIENT_ID` — optional, for Google sign-in
- Wait for deploy; verify health check: `GET https://<your-render-url>/api/health`
- Expected response: `{ "ok": true, "uptimeSec": ..., "products": N }`

### 22. Connect Vercel frontend to Render backend
- **Current state:** Vercel project `conqurer/gunji` has **no environment variables** set (checked via `npx vercel env ls`).
- In Vercel dashboard (or CLI), add:
  - `VITE_API_URL` = Render backend URL, e.g. `https://gunji-api.onrender.com` (**no trailing slash**)
- Redeploy Vercel so the frontend rebuilds with the correct API URL baked in:
  ```bash
  npx vercel --prod
  ```
- Test: open https://gunji.vercel.app — products should load from Render API.

---

## Important Technical Notes

- **All DB functions are now async.** Any caller that was previously synchronous must now `await` the result. Steps 13–16 completed this for all route handlers and middleware.
- **The `db.prepare()` compatibility layer** auto-translates `?` → `$1, $2, ...` and appends `RETURNING id` to INSERTs. Dynamic SQL built with string concatenation (like in `updateProduct`, `updateOrder`) also uses `?` placeholders that get translated.
- **Transactions** use `AsyncLocalStorage` — calling `tx(async () => { ... })` wraps all nested `db.prepare()` calls in a single PostgreSQL transaction automatically.
- **The `node:sqlite` import is completely removed.** The project no longer uses SQLite at all.
- **Node engine**: `package.json` specifies `"node": ">=24"`. Render's free tier supports Node 24+.
- **Express 5** (`^5.1.0`) automatically catches rejected promises from async route handlers — no extra wrapper needed.

---

## Files Modified (summary)

| File | Status |
|------|--------|
| `package.json` | Modified (added `pg`) |
| `server/config.js` | Modified (added `databaseUrl`) |
| `server/db/schema.sql` | Rewritten (PostgreSQL syntax) |
| `server/db/index.js` | Rewritten (pg Pool + compatibility layer) |
| `server/db/migrate.js` | **Deleted** |
| `server/db/users.js` | Rewritten (async) |
| `server/db/sessions.js` | Rewritten (async) |
| `server/db/settings.js` | Rewritten (async) |
| `server/db/products.js` | Rewritten (async) |
| `server/db/orders.js` | Rewritten (async) |
| `server/db/customRequests.js` | Rewritten (async) |
| `server/db/seed.js` | Rewritten (async) |
| `server/lib/authMiddleware.js` | **Done** — async |
| `server/routes/auth.js` | **Done** — async |
| `server/routes/public.js` | **Done** — async |
| `server/routes/admin.js` | **Done** — async |
| `render.yaml` | **Done** — free tier + DATABASE_URL |
| `.env.example` | **Done** — DATABASE_URL docs |
| `MIGRATION_HANDOFF.md` | This file |

---

## Quick verification checklist (after deploy)

- [ ] `GET /api/health` returns `{ ok: true }`
- [ ] `GET /api/products` returns product list
- [ ] Admin login at `/admin` works with `ADMIN_PASSWORD`
- [ ] Frontend at https://gunji.vercel.app loads products (needs `VITE_API_URL` set + redeploy)
- [ ] CORS works (no browser console errors on cross-origin API calls)
