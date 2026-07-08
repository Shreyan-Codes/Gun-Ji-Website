# GUN-जी™ — site + backend

Vite + React storefront with an Express + SQLite backend:

- **Shop (cart + checkout)** — product pages at `/product/:slug` with a
  variant picker (colour swatches + size buttons driven by stock), a
  client-side `/cart`, and a `/checkout` with a shipping form. Orders are
  multi-item and stock-enforced (the API rejects and won't oversell). No
  payment upfront — checkout captures the order and offers a one-tap
  WhatsApp/DM to finalise price & delivery, keeping the brand's DM-first close.
  Guests can check out; logged-in buyers get their orders saved to their
  account.
- **Customer accounts** — `/account` is a login/signup portal with email +
  password and "Sign in with Google". Logged-in buyers get their name
  prefilled at checkout and an order history in the portal; the admin order
  book shows which orders came from a registered account. Sessions are Bearer
  tokens (30-day), passwords are scrypt-hashed, and the Google ID token is
  verified server-side against Google's public keys. **Google sign-in stays
  hidden until you set `GOOGLE_CLIENT_ID`** in `.env` (see below); email/password
  works with no setup.
- **Catalog API** — tees, prices and the WhatsApp number live in SQLite and are
  editable from the admin panel; the site updates without a redeploy. If the
  API is ever down, the site falls back to the static launch catalog in
  `src/data/products.jsx`.
- **Custom print inbox** — the "Drop the idea here" form on `/custom-print`
  posts to the API and lands in the admin panel.
- **Order book** — direct orders from the site (with a price snapshot &
  computed total) plus DM orders you log yourself, with statuses
  (`new → contacted → confirmed → delivered`).
- **Admin dashboard** — `/admin` (password in `.env`, `ADMIN_PASSWORD`).

## Run it

```bash
npm install
npm run dev        # frontend on :5173, API on :3001 (proxied)
```

- Site: http://localhost:5173
- Admin: http://localhost:5173/admin (or :3001/admin)

## Production

```bash
npm run build      # builds the site into dist/
npm start          # one process serves site + API + admin on API_PORT
```

## Database

Raw SQLite via Node's built-in `node:sqlite` (no ORM). The layer lives in
`server/db/`:

- `index.js` — opens the connection, sets PRAGMAs, runs the schema + migration,
  seeds default settings and the admin user; exports `db` and a `tx()` helper.
- `schema.sql` — every `CREATE TABLE IF NOT EXISTS`, run on each boot.
- `migrate.js` — one-time, idempotent upgrade from the old single-file schema
  (backs the DB up first, renames legacy tables, copies data across).
- One thin module per entity: `users.js`, `sessions.js`, `products.js`
  (+ images/variants), `orders.js` (+ order_items), `settings.js`,
  `customRequests.js` — plain prepared-statement functions.

Tables: `users` (role customer/admin), `sessions`, `products`,
`product_images`, `product_variants` (size×colour stock/sku), `orders`,
`order_items`, `settings`, `custom_requests`. Foreign keys are ON with
`ON DELETE` rules; CHECK constraints guard status enums and `stock >= 0`.

```bash
npm run seed              # sample products + variants (only if empty)
npm run seed -- --force   # wipe products/images/variants and reseed
```

## Configuration (`.env`)

Copy `.env.example` → `.env`. `ADMIN_PASSWORD` is required for admin login —
the admin is a row in `users` with `role='admin'` whose password mirrors this
value (refreshed each boot). The DB is created automatically at `data/gunji.db`
(gitignored) and seeded on first boot; an older DB is migrated + backed up
(`data/gunji.db.backup-*`) automatically.

### Enabling "Sign in with Google"

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth client ID** of type **Web application**.
3. Under **Authorized JavaScript origins** add your origins — e.g.
   `http://localhost:5173` for dev and your live domain for production.
4. Copy the **Client ID** into `GOOGLE_CLIENT_ID` in `.env` and restart.

The button appears automatically once the ID is set. No client secret is
needed — the browser gets an ID token via Google Identity Services and the
server verifies it against Google's public keys.

## API surface

Public: `GET /api/health`, `GET /api/products`, `GET /api/products/:id`,
`GET /api/settings`, `POST /api/orders`, `POST /api/custom-requests`.
Public POSTs are rate-limited and honeypot-protected.

Customer auth: `GET /api/auth/config`, `POST /api/auth/signup`,
`POST /api/auth/login`, `POST /api/auth/google`, `POST /api/auth/logout`,
`GET /api/auth/me`, `GET /api/auth/orders` (own history). Bearer token.

Admin (Bearer token from `POST /api/admin/login`): CRUD on products, orders,
custom requests; `PUT /api/admin/settings`; `GET /api/admin/stats`.

## Notes

- Prices seeded in the DB are still the launch placeholders — set the real
  tags in **/admin → Products**.
- The WhatsApp number is empty until set in **/admin → Settings**; order
  buttons fall back to Instagram DM.
