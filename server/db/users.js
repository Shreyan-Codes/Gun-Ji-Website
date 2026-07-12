import { db, tx } from "./index.js";

// Thin data access for the `users` table. Password hashing lives in
// lib/password.js — this module only stores/reads the hash + salt columns.

const byId = db.prepare("SELECT * FROM users WHERE id = ?");
const byEmail = db.prepare("SELECT * FROM users WHERE email = ?");
const byGoogle = db.prepare("SELECT * FROM users WHERE google_id = ?");
const byRole = db.prepare("SELECT * FROM users WHERE role = ? ORDER BY id LIMIT 1");

const insertUser = db.prepare(
  `INSERT INTO users (email, name, password_hash, salt, google_id, avatar_url, role)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

export const findUserById = async (id) => (await byId.get(id)) || null;
export const findUserByEmail = async (email) => (await byEmail.get(String(email).toLowerCase())) || null;
export const findUserByGoogleId = async (sub) => (await byGoogle.get(sub)) || null;
export const findAdmin = async () => (await byRole.get("admin")) || null;

// `password` is pre-hashed: { hash, salt } (or nulls for Google-only accounts).
export async function createUser({ email, name = "", password = null, googleId = null, avatarUrl = "", role = "customer" }) {
  const info = await insertUser.run(
    String(email).toLowerCase(),
    name,
    password?.hash ?? null,
    password?.salt ?? null,
    googleId,
    avatarUrl,
    role
  );
  return await findUserById(Number(info.lastInsertRowid));
}

// Links a Google identity (and optional profile bits) onto an existing user.
export async function attachGoogle(id, { googleId, avatarUrl = "", name = "" }) {
  await db.prepare(
    `UPDATE users
        SET google_id  = ?,
            avatar_url = CASE WHEN ? <> '' THEN ? ELSE avatar_url END,
            name       = CASE WHEN name = '' THEN ? ELSE name END,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`
  ).run(googleId, avatarUrl, avatarUrl, name, id);
  return await findUserById(id);
}

// Self-serve account deletion (GDPR-style). Anonymizes the user's orders —
// blanks personal fields and unlinks them — so sales history/stock stay intact,
// then deletes the account. Sessions + wishlist cascade via their FKs. Guarded
// to customers so an admin can't delete itself through the customer route.
export async function deleteAccount(userId) {
  return tx(async () => {
    await db.prepare(
      `UPDATE orders
          SET shipping_name = '', shipping_address = '', shipping_phone = '',
              contact = '', note = '',
              location_lat = NULL, location_lng = NULL, location_accuracy = NULL,
              user_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?`
    ).run(userId);
    const info = await db.prepare("DELETE FROM users WHERE id = ? AND role = 'customer'").run(userId);
    return info.changes > 0;
  });
}

// Public-safe shape — never leaks password_hash, salt, or google_id.
export function userToJson(row) {
  if (!row) return null;
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
