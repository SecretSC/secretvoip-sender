// Centralised input validation shared by every send path.
// CRITICAL: never let an SMS reach the upstream without a valid sender_id.
// An empty/whitespace sender causes the upstream provider's default sender
// to be used, which would leak the upstream brand to the recipient.

export const SENDER_ID_HELP =
  "Sender ID is required. 2-11 characters, letters/numbers and  . _ - allowed.";

export function validateSenderId(raw) {
  if (typeof raw !== "string") return { ok: false, message: "Sender ID is required" };
  const v = raw.trim();
  if (!v) return { ok: false, message: "Sender ID is required" };
  if (v.length < 2 || v.length > 11)
    return { ok: false, message: "Sender ID must be 2-11 characters" };
  if (!/^[A-Za-z0-9 ._-]+$/.test(v))
    return {
      ok: false,
      message: "Sender ID may only contain letters, numbers, space, dot, underscore or dash",
    };
  return { ok: true, value: v };
}

// Partially mask a phone number for safe inclusion in error logs / UI.
// Keeps the dial prefix and last 2 digits, masks everything in between.
export function redactPhone(raw) {
  if (raw == null) return raw;
  const s = String(raw);
  if (s.includes(",")) return s.split(",").map(redactPhone).join(",");
  const digits = s.replace(/[^\d]/g, "");
  if (digits.length < 6) return "***";
  const head = digits.slice(0, 2);
  const tail = digits.slice(-2);
  return `${head}${"*".repeat(Math.max(3, digits.length - 4))}${tail}`;
}

// Strip any upstream provider branding from strings before they leave the
// backend. Mirrors the rebrandLabels logic in upstream.js so error paths
// can never leak the provider name through a thrown message or response.
export function sanitizeOutbound(value) {
  if (Array.isArray(value)) return value.map(sanitizeOutbound);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitizeOutbound(v);
    return out;
  }
  if (typeof value === "string") {
    return value
      .replace(/ttsky/gi, "Sub")
      .replace(/skytelecom/gi, "Provider");
  }
  return value;
}
