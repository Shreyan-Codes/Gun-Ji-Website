import crypto from "node:crypto";
import { config } from "../config.js";

// Verifies a "Sign in with Google" ID token locally (the way Google recommends
// for production): fetch Google's public keys, check the RS256 signature, then
// validate the standard claims. No third-party dependency — Node's crypto can
// build a public key straight from a JWK and verify RSA-SHA256.

const CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

let jwks = { keys: new Map(), expiresAt: 0 };

async function keyForKid(kid) {
  if (Date.now() >= jwks.expiresAt || !jwks.keys.has(kid)) {
    const res = await fetch(CERTS_URL);
    if (!res.ok) throw new Error("Could not reach Google's key server");
    const body = await res.json();
    const keys = new Map((body.keys || []).map((jwk) => [jwk.kid, jwk]));
    const maxAge = /max-age=(\d+)/.exec(res.headers.get("cache-control") || "");
    jwks = { keys, expiresAt: Date.now() + (maxAge ? Number(maxAge[1]) * 1000 : 3600 * 1000) };
  }
  return jwks.keys.get(kid) || null;
}

const decodeSegment = (seg) => JSON.parse(Buffer.from(seg, "base64url").toString("utf8"));

export async function verifyGoogleIdToken(idToken) {
  if (!config.googleClientId) throw new Error("Google sign-in is not configured");
  if (typeof idToken !== "string" || idToken.split(".").length !== 3) {
    throw new Error("Malformed Google token");
  }

  const [headerB64, payloadB64, sigB64] = idToken.split(".");
  const header = decodeSegment(headerB64);
  if (header.alg !== "RS256") throw new Error("Unexpected token algorithm");

  const jwk = await keyForKid(header.kid);
  if (!jwk) throw new Error("Unknown Google signing key");

  const verified = crypto.verify(
    "RSA-SHA256",
    Buffer.from(`${headerB64}.${payloadB64}`),
    crypto.createPublicKey({ key: jwk, format: "jwk" }),
    Buffer.from(sigB64, "base64url")
  );
  if (!verified) throw new Error("Invalid token signature");

  const p = decodeSegment(payloadB64);
  if (!GOOGLE_ISSUERS.has(p.iss)) throw new Error("Unexpected token issuer");
  if (p.aud !== config.googleClientId) throw new Error("Token was issued for a different app");
  const now = Math.floor(Date.now() / 1000);
  if (typeof p.exp !== "number" || p.exp <= now) throw new Error("Token has expired");
  if (!p.email) throw new Error("Google account has no email");

  return {
    sub: String(p.sub),
    email: String(p.email).toLowerCase(),
    emailVerified: p.email_verified === true || p.email_verified === "true",
    name: p.name || p.given_name || "",
    picture: p.picture || "",
  };
}
