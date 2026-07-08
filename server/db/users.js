import { db } from "./index.js";

// Thin data access for the `users` table. Password hashing lives in
// lib/password.js — this module only stores/reads the hash + salt columns.

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

const byId = db.prepare("SELECT * FROM users WHERE id = ?");
const byEmail = db.prepare("SELECT * FROM users WHERE email = ?");
const byGoogle = db.prepare("SELECT * FROM users WHERE google_id = ?");
const byRole = db.prepare("SELECT * FROM users WHERE role = ? ORDER BY id LIMIT 1");

const insertUser = db.prepare(
  `INSERT INTO users (email, name, password_hash, salt, google_id, avatar_url, role)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

export const findUserById = (id) => byId.get(id) || null;
export const findUserByEmail = (email) => byEmail.get(String(email).toLowerCase()) || null;
export const findUserByGoogleId = (sub) => byGoogle.get(sub) || null;
export const findAdmin = () => byRole.get("admin") || null;

// `password` is pre-hashed: { hash, salt } (or nulls for Google-only accounts).
export function createUser({ email, name = "", password = null, googleId = null, avatarUrl = "", role = "customer" }) {
  const info = insertUser.run(
    String(email).toLowerCase(),
    name,
    password?.hash ?? null,
    password?.salt ?? null,
    googleId,
    avatarUrl,
    role
  );
  return findUserById(Number(info.lastInsertRowid));
}

// Links a Google identity (and optional profile bits) onto an existing user.
export function attachGoogle(id, { googleId, avatarUrl = "", name = "" }) {
  db.prepare(
    `UPDATE users
        SET google_id  = ?,
            avatar_url = CASE WHEN ? <> '' THEN ? ELSE avatar_url END,
            name       = CASE WHEN name = '' THEN ? ELSE name END,
            updated_at = ${NOW}
      WHERE id = ?`
  ).run(googleId, avatarUrl, avatarUrl, name, id);
  return findUserById(id);
}

// Public-safe shape — never leaks password_hash, salt, or google_id.
export function userToJson(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    role: row.role,
    hasPassword: !!row.password_hash,
    google: !!row.google_id,
    createdAt: row.created_at,
  };
}
