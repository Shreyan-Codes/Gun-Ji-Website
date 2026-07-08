import { Router } from "express";
import { config } from "../config.js";
import { clean } from "../lib/validate.js";
import { rateLimit } from "../lib/rateLimit.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { bearer, requireCustomer } from "../lib/authMiddleware.js";
import { createSession, destroySession } from "../db/sessions.js";
import { findUserByEmail, findUserByGoogleId, createUser, attachGoogle, userToJson } from "../db/users.js";
import { listOrdersByUser } from "../db/orders.js";
import { verifyGoogleIdToken } from "../lib/googleAuth.js";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 200;
const authLimit = rateLimit({ name: "auth", windowMs: 15 * 60 * 1000, max: 20 });

// Response key stays `customer` so the existing frontend Auth context is unchanged.
async function issue(res, user, status = 200) {
  const session = await createSession(user.id, config.customerSessionTtlMs);
  res.status(status).json({ ...session, customer: userToJson(user) });
}

router.get("/config", (req, res) => {
  res.json({ googleEnabled: !!config.googleClientId, googleClientId: config.googleClientId });
});

router.post("/signup", authLimit, async (req, res) => {
  const { ok, errors, value } = clean(
    {
      name: { required: true, max: 80 },
      email: { required: true, max: 160, pattern: EMAIL_RE, patternMsg: "Enter a valid email" },
    },
    req.body
  );
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (password.length < MIN_PASSWORD) errors.password = `At least ${MIN_PASSWORD} characters`;
  else if (password.length > MAX_PASSWORD) errors.password = "That password is too long";
  if (!ok || errors.password) return res.status(400).json({ error: "Check the fields", errors });

  if (await findUserByEmail(value.email)) {
    return res.status(409).json({ error: "That email already has an account", errors: { email: "Already registered — try logging in" } });
  }
  const user = await createUser({ email: value.email, name: value.name, password: hashPassword(password) });
  await issue(res, user, 201);
});

router.post("/login", authLimit, async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const user = email ? await findUserByEmail(email) : null;
  if (!user || !verifyPassword(password, user.password_hash, user.salt)) {
    return res.status(401).json({ error: "Wrong email or password" });
  }
  await issue(res, user);
});

router.post("/google", authLimit, async (req, res) => {
  const idToken = req.body?.credential || req.body?.idToken;
  let payload;
  try {
    payload = await verifyGoogleIdToken(idToken);
  } catch {
    return res.status(401).json({ error: "Google sign-in failed — please try again." });
  }
  if (!payload.emailVerified) {
    return res.status(401).json({ error: "Your Google email isn't verified." });
  }

  // Match on Google id first, then email (links Google to an existing account).
  let user = (await findUserByGoogleId(payload.sub)) || (await findUserByEmail(payload.email));
  if (user) {
    user = await attachGoogle(user.id, { googleId: payload.sub, avatarUrl: payload.picture, name: payload.name });
  } else {
    user = await createUser({ email: payload.email, name: payload.name, googleId: payload.sub, avatarUrl: payload.picture });
  }
  await issue(res, user);
});

router.post("/logout", async (req, res) => {
  await destroySession(bearer(req));
  res.json({ ok: true });
});

router.get("/me", requireCustomer, (req, res) => {
  res.json({ customer: userToJson(req.user) });
});

router.get("/orders", requireCustomer, async (req, res) => {
  res.json({ items: await listOrdersByUser(req.user.id) });
});

export default router;
