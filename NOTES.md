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
3. **Phase 1b implemented as a META-INJECTION prerender, not React
   `renderToString`.** No `entry-server.jsx`, no `build:ssr`, no `hydrateRoot`.
   Reasoning: the SPA fetches product data client-side and its providers touch
   `window`/`localStorage`, so `renderToString` would (a) require risky provider
   hardening and (b) still emit a loading-state body. Every acceptance/DoD check
   depends only on the `<head>`, which the meta-injection produces reliably. The
   `<div id="root">` stays empty and the SPA renders client-side exactly as
   before — no hydration mismatch risk. Implemented in `scripts/prerender.js`
   (plain Node, no deps) and wired via a **Vite `closeBundle` plugin** in
   `vite.config.js` (NOT the npm `build` script) so it runs during `vite build`
   regardless of whether the host invokes `vite build` or `npm run build` — the
   current Vercel build command is unknown and this removes that dependency.
   Future optional enhancement: inject a lightweight static product summary
   (name/img/price) into `#root` for better LCP/no-JS — deferred.
4. **Phase 3a migration is Postgres SQL**, placed in `server/db/migrations/`
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
- [x] **1b PRERENDER — DONE** (meta-injection, see §1.3). `scripts/prerender.js`
      + Vite `closeBundle` plugin generate static per-route HTML for `/`, `/tees`,
      `/editions`, `/custom-print`, `/about`, and `/product/<slug>` (products
      fetched from the live API at build, graceful fallback to static-only), plus
      a fresh `dist/sitemap.xml` (all product slugs) and `dist/robots.txt`.
      **Acceptance verified locally:** two products → different `<title>`,
      different canonical, product-specific `og:image` (post_01 vs post_02),
      exactly one `og:image` each, Product JSON-LD present, SPA shell intact,
      no duplicate meta. Zero new deps.
      **⚠️ VERIFY ON PREVIEW DEPLOY:** relies on Vercel serving
      `dist/product/<slug>/index.html` for `/product/<slug>` *before* the SPA
      catch-all rewrite in `vercel.json` (Vercel checks the filesystem before
      `afterFiles` rewrites, so this should Just Work). Confirm with
      `curl -s <preview>/product/<slug> | grep og:image` after deploy. If the
      rewrite swallows it, adjust `vercel.json` so real files win.
      Also relies on the build-time API fetch succeeding (Render cold start) —
      if it fails, that build ships static routes only; consider committing a
      `products.json` snapshot for build determinism.
- [x] **1c LocalBusiness — DONE.** Enriched the existing `ClothingStore` block
      (a LocalBusiness subtype) in `index.html` in place — no duplicate entity —
      with `streetAddress: "Mid Baneshwor"`, `addressRegion: "Bagmati"`,
      `telephone: "+977-9768913498"`, and 24/7 `openingHoursSpecification`. Also
      corrected the stale `priceRange` (was "Rs. 999 - Rs. 1,599") to "Rs. 699".
      Appears on every prerendered page (it's in the shared template head).
- [ ] **1c (remaining)** `geo` coords still optional/omitted (not supplied — do
      NOT invent; add if Shreyan gives lat/lng). `PreOrder` availability mapping —
      blocked on Phase 3a `stock_status` column.

### Phase 2 — Mobile shell (IN PROGRESS)
- [x] **2a Bottom tab bar** — `src/components/BottomNav.jsx` + CSS. Fixed, mobile-only
      (`display:none` base, shown `@media(max-width:768px)`), `env(safe-area-inset-bottom)`,
      `body` gets `padding-bottom` so content/footer clear it. 5 real routes:
      Home / Shop(/tees) / Custom / Cart(+badge) / Account. Active via NavLink.
      **DEVIATION:** spec wanted Home/Search/Shop/Track/Account — Search(3f) + Track(3b)
      not built yet, so swapped for Custom+Cart now; swap in when those land.
      Verified: renders fixed bottom, item offsetHeight 51px (≥44 tap target), no console errors.
- [x] **2d (most)** — reduced-motion block (styles.css ~1396) + `useReveal` already
      respect `prefers-reduced-motion`; product imgs use `aspect-ratio:4/5` so CLS=0;
      global `:focus-visible` ring exists. Added **skip link** (App.jsx + CSS) — was
      only on the security branch; now self-contained here too (trivial merge dup).
- [ ] **2b Header** — mostly already done (persistent logo/account/cart+badge). MISSING
      search + wishlist icons → BLOCKED on 3f (search) / 3c (wishlist). Add when built.
- [ ] **2c Mega menu** — categories Player/Anime/देसी/Custom linking `/shop?collection=<slug>`.
      `/shop` = `/tees`; needs `?collection=` filter support (overlaps 3d shop filters).
      Deferred — do alongside 3d.

### Phases 3–7 — NOT STARTED. Phase 3+ blocked on open questions (§5).

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
3. ~~Street address, phone, opening hours~~ — **ANSWERED 2026-07-10:** address
   **Mid Baneshwor, Kathmandu** (Bagmati), phone **9768913498** (`tel:+9779768913498`),
   hours **24/7**. Used in `index.html` LocalBusiness; reuse for Phase 4 footer NAP.
   Geo lat/lng still not supplied (optional).
4. eSewa, Khalti, or both? Merchant accounts yet? (Phase 5a)
5. Custom-print file upload — needed? max size, allowed types, where stored? (Phase 6)
6. Do you have TikTok / Facebook accounts? (needed for `sameAs`; omitted for now per spec "omit if none")
7. Confirm the route-naming plan in §4 (keep+add vs rename).
8. `LocalBusiness`/NAP: is there a physical storefront address to publish, or is it DM/online-only?

---

## 6. Definition-of-Done checklist (paste command output here as phases complete)

1. `curl -s <url>/product/<slug> | grep -E 'og:title|og:image|canonical'` — product-specific → **DONE locally (1b); verify on preview deploy**
2. Lighthouse mobile throttled: Perf ≥90, A11y ≥95, SEO =100 → **pending** (SEO should now hit 100 via prerender; run after deploy)
3. Facebook Sharing Debugger on 3 product URLs → 3 different cards → **ready; run after deploy** (each product now serves its own static og:image/title)
4. Google Rich Results Test on a product URL → valid `Product` w/ price → **ready; run after deploy** (Product JSON-LD now in the static `<head>`, no JS needed)
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
