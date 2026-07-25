// Tiny schema validator: trims strings, coerces ints/bools, enforces
// required / max / enum / pattern. Returns { ok, errors, value }.

export function clean(spec, input = {}) {
  const value = {};
  const errors = {};

  for (const [key, rule] of Object.entries(spec)) {
    let v = input?.[key];
    if (typeof v === "string") v = v.trim();
    const empty = v === undefined || v === null || v === "";

    if (empty) {
      if (rule.required) {
        errors[key] = "Required";
      } else if (rule.default !== undefined) {
        value[key] = rule.default;
      } else {
        value[key] = rule.type === "int" || rule.type === "num" ? null : rule.type === "bool" ? 0 : "";
      }
      continue;
    }

    if (rule.type === "int") {
      const n = Number(v);
      if (!Number.isInteger(n)) { errors[key] = "Must be a whole number"; continue; }
      if (rule.min !== undefined && n < rule.min) { errors[key] = `Must be at least ${rule.min}`; continue; }
      if (rule.max !== undefined && n > rule.max) { errors[key] = `Must be at most ${rule.max}`; continue; }
      value[key] = n;
      continue;
    }

    if (rule.type === "num") {
      const n = Number(v);
      if (!Number.isFinite(n)) { errors[key] = "Must be a number"; continue; }
      if (rule.min !== undefined && n < rule.min) { errors[key] = `Must be at least ${rule.min}`; continue; }
      if (rule.max !== undefined && n > rule.max) { errors[key] = `Must be at most ${rule.max}`; continue; }
      value[key] = n;
      continue;
    }

    if (rule.type === "bool") {
      value[key] = v === true || v === 1 || v === "1" || v === "true" ? 1 : 0;
      continue;
    }

    if (typeof v !== "string") { errors[key] = "Must be text"; continue; }
    if (rule.max && v.length > rule.max) { errors[key] = `Keep it under ${rule.max} characters`; continue; }
    if (rule.enum && !rule.enum.includes(v)) { errors[key] = "Invalid value"; continue; }
    if (rule.pattern && !rule.pattern.test(v)) { errors[key] = rule.patternMsg || "Invalid format"; continue; }
    value[key] = v;
  }

  return { ok: Object.keys(errors).length === 0, errors, value };
}

export const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
export const CUSTOM_STATUSES = ["new", "discussing", "printing", "delivered", "declined"];
export const CONTACT_METHODS = ["instagram", "whatsapp", "phone", "email"];
export const EDITIONS = ["signature", "player", "anime", "desi", "custom"];
