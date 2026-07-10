// Minimal fetch helpers for the GUN-जी API. Writes fail fast, while safe GET
// requests get enough time to survive Render Free's occasional cold start.

const WRITE_TIMEOUT_MS = 6000;
const REMOTE_GET_TIMEOUT_MS = 25_000;
const REMOTE_GET_ATTEMPTS = 3;
const RETRYABLE_STATUS = new Set([502, 503, 504]);

// In production (Vercel), point at the Render backend via VITE_API_URL, e.g.
// https://gunji-api.onrender.com. In dev it's empty, so paths stay relative
// and Vite proxies /api to the local backend.
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, { status = 0, errors = {} } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors; // per-field messages from the server validator
  }
}

async function request(path, options = {}) {
  const { token, headers, ...rest } = options;
  const finalHeaders = { Accept: "application/json", ...headers };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  // Only retry idempotent remote reads. Retrying a checkout or any other
  // mutation could submit it twice, so those retain the quick 6s timeout.
  const isGet = !rest.method || rest.method === "GET";
  const attempts = isGet && API_BASE ? REMOTE_GET_ATTEMPTS : 1;
  const timeoutMs = isGet && API_BASE ? REMOTE_GET_TIMEOUT_MS : WRITE_TIMEOUT_MS;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let res;
    try {
      res = await fetch(API_BASE + path, {
        ...rest,
        headers: finalHeaders,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      if (attempt === attempts) throw new ApiError("Network problem — check your connection.");
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
      continue;
    }

    let data = {};
    try {
      data = await res.json();
    } catch {
      // non-JSON response body
    }

    if (res.ok) return data;
    if (attempt < attempts && RETRYABLE_STATUS.has(res.status)) {
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
      continue;
    }
    throw new ApiError(data.error || `Request failed (${res.status})`, {
      status: res.status,
      errors: data.errors || {},
    });
  }
}

// opts may carry { token } to send an Authorization: Bearer header.
export const apiGet = (path, opts = {}) => request(path, opts);

export const apiPost = (path, body, opts = {}) =>
  request(path, {
    ...opts,
    method: "POST",
    headers: { "Content-Type": "application/json", ...opts.headers },
    body: JSON.stringify(body),
  });

export const apiDelete = (path, opts = {}) => request(path, { ...opts, method: "DELETE" });
