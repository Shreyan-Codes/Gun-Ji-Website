// Minimal fetch helpers for the GUN-जी API. Every call times out fast and
// throws ApiError so callers can fall back to static data gracefully.

const TIMEOUT_MS = 6000;

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

  let res;
  try {
    res = await fetch(API_BASE + path, {
      ...rest,
      headers: finalHeaders,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ApiError("Network problem — check your connection.");
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    // non-JSON response body
  }

  if (!res.ok) {
    throw new ApiError(data.error || `Request failed (${res.status})`, {
      status: res.status,
      errors: data.errors || {},
    });
  }
  return data;
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
