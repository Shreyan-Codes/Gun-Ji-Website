import { userForToken } from "../db/sessions.js";

// Bearer-token auth backed by the unified sessions table. A session resolves to
// a `users` row; admin vs customer is the row's `role`.

export function bearer(req) {
  const header = req.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

export async function requireCustomer(req, res, next) {
  const user = await userForToken(bearer(req));
  if (!user) return res.status(401).json({ error: "Please log in to continue" });
  req.user = user;
  next();
}

// Sets req.user when a valid token is present, but never blocks — lets an order
// link to an account when the buyer happens to be logged in.
export async function optionalCustomer(req, res, next) {
  req.user = await userForToken(bearer(req));
  next();
}

export async function requireAdmin(req, res, next) {
  const user = await userForToken(bearer(req));
  if (!user || user.role !== "admin") {
    return res.status(401).json({ error: "Admin login required" });
  }
  req.user = user;
  req.sessionExpiresAt = user.session_expires_at;
  next();
}
