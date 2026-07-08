// In-memory sliding-window rate limiter. Plenty for a single-process
// brand site; swap for something shared if this ever runs multi-instance.

const buckets = new Map();

export function rateLimit({ name, windowMs, max }) {
  return (req, res, next) => {
    const key = `${name}:${req.ip}`;
    const now = Date.now();
    const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);

    if (hits.length >= max) {
      const retryAfterSec = Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000));
      res.set("Retry-After", String(retryAfterSec));
      return res.status(429).json({ error: "Too many requests — please try again in a bit." });
    }

    hits.push(now);
    buckets.set(key, hits);
    next();
  };
}

// Sweep stale buckets so the map can't grow unbounded.
const SWEEP_EVERY = 10 * 60 * 1000;
const MAX_AGE = 60 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, hits] of buckets) {
    if (hits.length === 0 || now - hits[hits.length - 1] > MAX_AGE) buckets.delete(key);
  }
}, SWEEP_EVERY).unref();
