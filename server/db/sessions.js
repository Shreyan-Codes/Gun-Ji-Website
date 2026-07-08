import crypto from "node:crypto";
import { db } from "./index.js";
import { hashToken } from "../lib/password.js";

// Session store shared by admin + customer logins. The random token goes to
// the client; only its SHA-256 hash is stored here.

const insert = db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)");
const del = db.prepare("DELETE FROM sessions WHERE token = ?");
const joinUser = db.prepare(
  `SELECT u.*, s.expires_at AS session_expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > ?`
);
const prune = db.prepare("DELETE FROM sessions WHERE expires_at <= ?");

export function createSession(userId, ttlMs) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  insert.run(hashToken(token), userId, expiresAt);
  return { token, expiresAt };
}

export function destroySession(token) {
  if (typeof token === "string" && token) del.run(hashToken(token));
}

// Returns the joined user row (with session_expires_at) or null.
export function userForToken(token) {
  if (typeof token !== "string" || !token) return null;
  return joinUser.get(hashToken(token), new Date().toISOString()) || null;
}

export function pruneSessions() {
  prune.run(new Date().toISOString());
}

// Hourly cleanup of expired sessions.
setInterval(pruneSessions, 60 * 60 * 1000).unref();
