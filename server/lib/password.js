import crypto from "node:crypto";

// scrypt password hashing with a per-user random salt. Kept dependency-free
// and separate from any DB import so both the seeder and the auth routes can
// use it without a circular import. Stores hash + salt as hex (separate
// columns in the users table).

const KEYLEN = 64;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEYLEN);
  return { hash: hash.toString("hex"), salt: salt.toString("hex") };
}

export function verifyPassword(password, hashHex, saltHex) {
  if (
    typeof password !== "string" || password.length === 0 ||
    typeof hashHex !== "string" || !hashHex ||
    typeof saltHex !== "string" || !saltHex
  ) {
    return false;
  }
  const expected = Buffer.from(hashHex, "hex");
  let actual;
  try {
    actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  } catch {
    return false;
  }
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

// SHA-256 of a session token — only the hash is ever stored, so a leaked DB
// can't be replayed as a login.
export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
