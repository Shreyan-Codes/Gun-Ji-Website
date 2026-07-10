# Gunji Overhaul — Working Notes & Continuation File

> **Purpose:** This is the resume-from-here file for the multi-phase overhaul
> described in the spec Shreyan pasted. If a session ended mid-task, start by
> reading this top-to-bottom. It records (1) how the real codebase differs from
> the spec's assumptions, (2) deliberate deviations from the literal spec and
> why, (3) progress per phase, (4) the detailed plan for the big deferred item
> (prerendering), and (5) blocking questions.

Last updated: 2026-07-10. Current work branch: `feat/overhaul` (off `main`).

---

## 0. CRITICAL — stack reality vs. the spec's assumptions

The spec was written against an idealized/outdated mental model. Before doing
DB or SSR work, know these facts about the **actual** repo:

| Spec says | Reality in this repo | Consequence |
|---|---|---|
| `node:sqlite` builtin DB | **PostgreSQL (Supabase)** via `pg` Pool — see `server/db/index.js`. There is a shim `Stmt` class translating SQLite `?`→`$1` and some SQLite syntax. | Phase 3 migrations are **Postgres**, not SQLite. |
| Phase 3f: "SQLite FTS5" | Postgres has **no FTS5**. | Use Postgres **`tsvector`/`tsquery`** (or `pg_trgm`/`ILIKE`) full-text search. `node:sqlite` is NOT in use. This is a forced deviation — see §1. |
| Phase 1a: write `src/lib/head.js` `useHead` | **Already exists** as `src/lib/seo.js` → `usePageMeta()` + `useJsonLd()`, wired into *every* route. `ProductPage` already emits per-product meta + `Product` JSON-LD. | Phase 1a is effectively DONE. Do **not** duplicate it as `head.js`. The real Phase 1 gap is **1b prerender**. |
| Routes `/shop /custom /track /size-guide /policies/*` | App has `/tees /custom-print /editions /about /cart /checkout /account /product/:slug` (see `src/App.jsx`). No `/shop`, `/track`, `/size-guide`, `/policies`. | Route-name mapping decision needed — see §4. |
| React Router `StaticRouter`/`createStaticHandler` from `react-router` | Repo imports from **`react-router-dom` v7.18**. SSR helpers live in `react-router-dom/server` (`StaticRouter`) for this version. | Verify exact export before wiring `entry-server.jsx`. |
| Node builtin auth (`crypto.scrypt`) | Already implemented — `server/lib/password.js` uses scrypt+salt (verify it's not bare SHA-256 during Phase 6). | Phase 6 password item may already be satisfied; audit before "forcing a reset". |

**There is also a parallel branch `fix/security-headers-a11y-caching`** (not yet
merged) that already added: Vercel frontend security headers + CSP, immutable
asset caching, a WCAG-AA contrast fix, and a **skip-to-content link**. Phases
2d and 6 overlap with it — coordinate, don't duplicate. Once that branch merges
to `main`, rebase `feat/overhaul` on `main`.

---

## 1. Deliberate deviations from the literal spec (with reasoning)

The spec says: "If you believe a task requires a new dependency, stop and write
your reasoning here." Zero new deps have been added. Deviations so far:

1. **Phase 1a `head.js` NOT created.** Equivalent already exists as
   `src/lib/seo.js`. Creating a second hook would be redundant churn and
   violate "don't rewrite working components." Enrichments were made in place.
2. **Phase 3f FTS5 → Postgres full-text.** FTS5 is a SQLite-only feature; this
   app is Postgres. Plan: add a `tsvector` column (name + description +
   collection) with a GIN index, query with `plainto_tsquery`/`websearch_to_tsquery`.
   Fallback: `ILIKE '%q%'` if FTS proves fiddly. **No new npm package** either way.
3. **Phase 3a migration is Postgres SQL**, placed in `server/db/migrations/`
   (new dir). The app currently loads `server/db/schema.sql` via `db.exec` at
   boot; there is **no numbered-migration runner yet** — one must be built
   (a tiny Node script that applies un-applied `NNN_*.sql` files, tracked in a
   `schema_migrations` table). No dep needed.

---

## 2. Progress log

### Phase 1 — SEO & link previews  (IN PROGRESS)
- [x] **1a** per-route head management — *already existed* (`src/lib/seo.js`),
      verified wired into all routes. No new file created (see §1.1).
- [x] **1d** Homepage title → `Gunji — Oversized Tees & Custom Print | Kathmandu`
      (49 chars, ASCII "Gunji" present). Updated in `index.html` **and**
      `src/lib/seo.js` `DEFAULT_TITLE`. Added `og:locale:alternate = ne_NP`.
      `<html lang="en">` already present.
- [x] **1c (partial)** Added sitewide `Organization` JSON-LD to `index.html`
      (name "Gunji", alternateName ["GUN-जी","Gunji Nepal"], logo, sameAs IG).
      Enriched `Product` JSON-LD in `ProductPage.jsx`: `sku`, `itemCondition`,
      `image` as array, brand name → ASCII "Gunji".
- [ ] **1c (remaining)** `LocalBusiness` schema — **BLOCKED** on real address /
      phone / hours / geo (open question #3). `PreOrder` availability mapping —
      blocked on Phase 3a `stock_status` column.
- [ ] **1b PRERENDER — THE HEADLINE ITEM, NOT STARTED.** Detailed plan in §3.
      This is the only thing that fixes Instagram/TikTok/Facebook link previews
      (those crawlers don't run JS). Everything in 1a/1c only helps Google today.

### Phases 2–7 — NOT STARTED. See spec. Phase 3+ blocked on open questions (§5).

---

## 3. Phase 1b prerender — detailed implementation plan (do this next, carefully)

**Why deferred:** the context providers touch browser globals and would crash
under `renderToString`. This needs care, not a rushed tail-of-session attempt.

### Blockers to resolve first
- **SSR-safety of providers.** `src/context/Auth.jsx`, `Cart.jsx`, `SiteData.jsx`
  read `localStorage`/`window` and/or fetch from the API during init. Guard each
  with `typeof window !== "undefined"` and ensure no fetch fires during render
  (prerender should render the static/fallback state). Audit all three before
  wiring SSR.
- **Product slug source.** `src/data/products.jsx` (static fallback) has **no
  `slug` or `id`**. Real slugs come from the DB/`/api/products`. For prerender,
  either (a) query Postgres at build via `pg` (needs `DATABASE_URL` at build
  time), or (b) commit a `products.json` snapshot the build reads. Recommend (b)
  for build determinism + so link previews work even if DB is down at build.

### Steps
1. `src/entry-server.jsx` → `export function render(url)` using
   `renderToString(<StaticRouter location={url}>…providers…<App/></StaticRouter>)`.
   Import `StaticRouter` from `react-router-dom/server` (confirm for v7.18).
2. `package.json`: `"build:ssr": "vite build --ssr src/entry-server.jsx --outDir dist/server"`.
3. `scripts/prerender.js` (plain Node, no deps):
   - Read `dist/index.html` as template.
   - Read products from committed `products.json` (or Postgres).
   - Route list: `/`, `/tees`(=shop), `/about`, `/custom-print`, `/editions`,
     plus size-guide/policies/track **once those routes exist (Phases 2/4)**,
     and `/product/:slug` per product.
   - Per route: `render(url)` → inject HTML into `<div id="root">`, inject
     per-route `<title>`, description, canonical, full OG/Twitter, Product JSON-LD.
   - Write `dist/<route>/index.html`.
4. `"build": "vite build && npm run build:ssr && node scripts/prerender.js"`.
5. `src/main.jsx`: switch `createRoot` → `hydrateRoot` (guard: only hydrate if
   `#root` has children, else `createRoot`, so dev `index.html` still works).
6. Emit `dist/sitemap.xml` + `dist/robots.txt` from the same script (robots
   references the sitemap). NB: `public/robots.txt` + `public/sitemap.xml`
   already exist — decide whether the script overwrites or they stay static.
7. **Vercel routing:** current `vercel.json` rewrites all non-asset routes to
   `/index.html`. For prerendered pages to serve their own HTML, the rewrite
   must NOT swallow `/product/*` etc. Adjust so a real `dist/<route>/index.html`
   is served when present, falling back to SPA `index.html` otherwise.

### Acceptance (from spec)
- `curl -s <url>/product/<slug> | grep -c "og:image"` → 1, and it's *that*
  product's image (not `gunji_post_02.jpg`).
- Two different products → two different `<title>` and two different canonicals.

---

## 4. Route-naming decision (needs Shreyan confirm; recommendation below)

Spec route names ≠ app route names. **Recommended plan:** keep existing routes
working (don't break inbound links) and ADD the new ones, rather than renaming:
- `/tees`  → keep; treat as the "Shop". Optionally add `/shop` as an alias/redirect.
- `/custom-print` → keep; optionally alias `/custom`.
- `/about` → keep; it doubles as "Contact" (has the NAP info in Phase 4).
- **New routes to build:** `/track` (Phase 3b), `/size-guide` (Phase 4),
  `/policies/shipping|returns|custom-terms|privacy` (Phase 4).
- Bottom tab bar (Phase 2a) "Shop" → `/tees`, "Track Order" → `/track`.

---

## 5. Open questions for Shreyan (BLOCK Phase 3+ and parts of 1c/4)

1. Real delivery times & charges, inside vs outside the valley? (Phase 3e/4)
2. Pre-order lead time for custom prints? (Phase 3a copy)
3. Street address, phone, opening hours, geo coords? (Phase 1c LocalBusiness + Phase 4 NAP)
4. eSewa, Khalti, or both? Merchant accounts yet? (Phase 5a)
5. Custom-print file upload — needed? max size, allowed types, where stored? (Phase 6)
6. Do you have TikTok / Facebook accounts? (needed for `sameAs`; omitted for now per spec "omit if none")
7. Confirm the route-naming plan in §4 (keep+add vs rename).
8. `LocalBusiness`/NAP: is there a physical storefront address to publish, or is it DM/online-only?

---

## 6. Definition-of-Done checklist (paste command output here as phases complete)

1. `curl -s <url>/product/<slug> | grep -E 'og:title|og:image|canonical'` — product-specific → **pending 1b**
2. Lighthouse mobile throttled: Perf ≥90, A11y ≥95, SEO =100 → **pending**
3. Facebook Sharing Debugger on 3 product URLs → 3 different cards → **pending 1b**
4. Google Rich Results Test on a product URL → valid `Product` w/ price → partially ready (client-side JSON-LD exists; needs prerender for reliability)
5. Keyboard-only walkthrough never loses focus ring → **pending Phase 2d** (partly covered by security branch)
6. `npm ls --depth=0` byte-identical to start → **maintain: ZERO new deps so far ✅**

### Baseline `npm ls --depth=0` (record before Phase changes; must stay identical)
```
gunji-site@1.0.0
├── @vitejs/plugin-react
├── concurrently
├── express
├── pg
├── react
├── react-dom
├── react-router-dom
├── vercel
└── vite
```
