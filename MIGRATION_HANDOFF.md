# Migration Handoff — SQLite → PostgreSQL (Supabase)

This document explains all changes made so far and what remains, so any AI assistant or developer can pick up where we left off.

**Last updated:** 2026-07-08 — GitHub Copilot (Claude Haiku 4.5) — Ready for Deployment

---

## Quick Start for Deployers

If you're picking this up to deploy, here's the **TL;DR** in 10 minutes:

1. **Supabase Setup** (2–3 min):
   - Go to https://supabase.com → New Project
   - Region: Singapore or Mumbai (closest to Nepal)
   - Save the **Session pooler** connection string (port 6543)

2. **Render Deploy** (5 min):
   - Go to https://dashboard.render.com → New → Blueprint
   - Connect repo: `https://github.com/Shreyan-Codes/Gun-Ji-Website`
   - Set secrets: `DATABASE_URL`, `ADMIN_PASSWORD`, `CORS_ORIGINS=https://gunji.vercel.app`
   - Deploy and wait for green **Live** status
   - Test: `curl https://gunji-api.onrender.com/api/health`

3. **Vercel Frontend** (2–3 min):
   - Go to Vercel project → Settings → Environment Variables
   - Add: `VITE_API_URL=https://gunji-api.onrender.com` (your Render URL)
   - Run: `npx vercel --prod`
   - Test: https://gunji.vercel.app (products should load)

**See [Step 20–22](#what-still-needs-to-be-done) below for detailed instructions.**

---

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

### 19. Commit and push to GitHub ✅ (2026-07-08)
- **Status:** Done — pushed to `origin/main`.
- Commits pushed:
  - `3c0c3f9` — handoff doc + `.env.example` update
  - `1af4df4` — full SQLite → PostgreSQL migration (20 files)
- Remote: `https://github.com/Shreyan-Codes/Gun-Ji-Website.git`, branch `main`.
- Render should auto-deploy if the blueprint/service is connected to this repo.

### 20. Set up Supabase (if not done yet) 🔧 IN PROGRESS

**Steps:**
1. Go to https://supabase.com and sign in (or create a free account)
2. Click **New Project**
   - Organization: any name
   - Project name: `gun-ji` (or similar)
   - Password: generate a strong password (save it!)
   - Region: closest to Nepal is **Singapore** or **Mumbai**
3. Wait ~2 minutes for project creation to complete
4. Once created, go to **Project Settings** (gear icon, bottom-left)
5. Click **Database** tab
6. Under **Connection string**, select **Pooler** (not Direct)
7. Change **Session config** dropdown to **Transaction**
8. The URI will look like:
   ```
   postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
9. **Copy this connection string** — you'll need it for Render
10. The schema is applied automatically by `server/db/index.js` on first boot — **no manual SQL migration needed**

**After Supabase is ready:** Note down the full connection string. You'll paste it into Render as `DATABASE_URL`.

### 21. Deploy to Render 🚀 NEXT STEP

**Prerequisites:**
- Supabase DATABASE_URL ready (from step 20)
- GitHub repo connected: https://github.com/Shreyan-Codes/Gun-Ji-Website

**Steps:**
1. Go to https://dashboard.render.com and sign in (create account if needed)
2. From the top-right, click **New +**
3. Select **Blueprint**
4. For **GitHub repository**, paste: `https://github.com/Shreyan-Codes/Gun-Ji-Website`
5. Click **Connect**
6. Render will auto-detect and propose a service named `gunji-api` (with settings from `render.yaml`)
7. **Before clicking Deploy**, scroll down and set these **environment variables** as **secrets**:
   - **`DATABASE_URL`** (secret): Paste the Supabase Session pooler connection string from step 20
   - **`ADMIN_PASSWORD`** (secret): Generate a long random password (e.g., `openssl rand -base64 32`)
   - **`CORS_ORIGINS`** (secret): `https://gunji.vercel.app`
   - **`GOOGLE_CLIENT_ID`** (secret, optional): Leave blank for now; you can add it later if needed
8. Click **Deploy**
9. **Wait 3–5 minutes** for the deploy to finish
10. Once **Status** shows **Live**, check the health endpoint:
    - Copy the service URL (e.g., `https://gunji-api.onrender.com`)
    - In browser or `curl`, test: `GET https://gunji-api.onrender.com/api/health`
    - Expected response: `{ "ok": true, "uptimeSec": X, "products": N }`
11. If health check fails:
    - Click **Logs** tab in Render dashboard to debug
    - Check [Deployment Troubleshooting](#deployment-troubleshooting) section below

### 22. Connect Vercel frontend to Render backend 🔗 FINAL STEP

**Prerequisites:**
- Render backend is Live (from step 21)
- Render URL is ready (e.g., `https://gunji-api.onrender.com`)

**Steps:**
1. Go to https://vercel.com and sign in
2. Select project **gunji** (under **Shreyan-Codes** org)
3. Click **Settings** tab
4. Left sidebar → **Environment Variables**
5. Click **Add New**
   - **Name:** `VITE_API_URL`
   - **Value:** `https://gunji-api.onrender.com` (replace with your Render URL, **no trailing slash**)
   - **Environments:** Select **Production**
   - Click **Save**
6. Redeploy the frontend:
   ```bash
   cd c:\Users\shrey\Documents\gunji
   npm run build      # builds frontend
   npx vercel --prod  # deploys to Vercel production
   ```
7. **Wait 1–2 minutes** for deploy to finish
8. **Test the live site:**
   - Open https://gunji.vercel.app in browser
   - Check the **Products** page — should load from Render API
   - Try **Login** → verify tokens work (no CORS errors in console)
   - Try **Admin** → log in with email/password or the ADMIN_PASSWORD you set

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

## Deployment Troubleshooting

### Render Deploy Fails

**Problem:** Deploy shows error like `Error: Cannot find module 'pg'` or connection string issue.

**Solution:**
1. Check Render **Logs** tab for the exact error message
2. Common issues:
   - **Missing DATABASE_URL:** Ensure you set it as a secret environment variable in Render dashboard
   - **Wrong connection string format:** Double-check Supabase Session pooler (port 6543, not 5432)
   - **Node.js version:** Render defaults to Node 16–18; this project needs Node 24+. Add `engines` check in `package.json` or let `npm install` fail (Render will auto-upgrade to 24+)

**If still failing:**
1. Try redeploying: Click **Deploy** button in Render dashboard again
2. Check for typos in DATABASE_URL (copy-paste from Supabase directly)
3. Open a GitHub issue with the Render error log

### Health Check Returns Error

**Problem:** `GET /api/health` returns 5xx error or connection timeout.

**Solution:**
1. Check Render **Logs** tab — look for database connection errors
2. If DATABASE_URL is wrong, you'll see `error: connect ECONNREFUSED` or `no such host`
3. Re-verify Supabase connection string (Session pooler, port 6543, correct region)
4. If all else fails, restart the Render service: Go to **Settings** → **Restart instance**

### Products Don't Load on Frontend

**Problem:** https://gunji.vercel.app loads but products page is blank, or console shows CORS errors.

**Solution:**
1. Check **Vercel build logs:** Open Vercel project → **Deployments** → Click the failed/current build
2. Ensure `VITE_API_URL` is set correctly in Vercel **Environment Variables** (Settings → Environment Variables)
3. After setting `VITE_API_URL`, redeploy: `npx vercel --prod`
4. If still no products, check browser **Console** tab:
   - CORS error? Verify `CORS_ORIGINS` in Render is exactly `https://gunji.vercel.app`
   - 404 error? Check Render `/api/products` is working: `curl https://gunji-api.onrender.com/api/products`
5. If `/api/products` works from `curl` but not from browser, restart Render service

### Admin Login Not Working

**Problem:** Admin panel at `/admin` says invalid password.

**Solution:**
1. Verify `ADMIN_PASSWORD` was set as a **secret** environment variable in Render (not as a regular var)
2. Ensure it's the exact password you set (no extra spaces)
3. Try a simple password first for testing (e.g., `testpass123`)
4. If changed, redeploy Render: **Settings** → **Redeploy** in Render dashboard
5. After redeploy, try logging in again

### Supabase Connection Timeouts

**Problem:** Render logs show `timeout on Supabase connection` or `Error: connect ETIMEDOUT`.

**Solution:**
1. Verify Supabase project is still active (check supabase.com dashboard)
2. Check if Supabase free tier hit monthly active rows limit (rare, but possible)
3. Try using the **Transaction** pooler config (not Session) in Supabase: Go to **Project Settings → Database → Connection pooling** and select **Transaction** mode
4. Update DATABASE_URL in Render and redeploy
5. If still timing out, contact Supabase support

---

## Quick Verification Checklist

**After all three deployment steps are complete:**

- [ ] Supabase project created, Session pooler connection string copied
- [ ] Render service **Live** with green status
- [ ] `GET https://<render-url>/api/health` returns `{ "ok": true, "products": N }`
- [ ] `GET https://<render-url>/api/products` returns product list (JSON array)
- [ ] Vercel env var `VITE_API_URL` set to Render URL
- [ ] Vercel redeployed (`npx vercel --prod`)
- [ ] https://gunji.vercel.app loads and shows products
- [ ] Admin panel at `/admin` works with `ADMIN_PASSWORD`
- [ ] Customer login works (email/password or Google sign-in if `GOOGLE_CLIENT_ID` set)
- [ ] Browser console shows no CORS errors
- [ ] Cart and checkout flow works end-to-end
