// Centralised error logger. Writes to the error_logs table so admins can
// review every failure across the SMS system. Sensitive fields (api keys,
// tokens, authorization headers, passwords, cookies) are scrubbed before
// persisting; upstream provider brand names are also stripped.

import { pool } from "./db.js";

const REDACT_KEYS = /key|token|secret|authorization|password|bearer|cookie|set-cookie|session/i;

function scrubBrand(s) {
  if (typeof s !== "string") return s;
  return s.replace(/ttsky/gi, "Sub").replace(/skytelecom/gi, "Provider");
}

export function scrub(value) {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) =>
        REDACT_KEYS.test(k) ? [k, "[redacted]"] : [k, scrub(v)]
      )
    );
  }
  if (typeof value === "string") return scrubBrand(value);
  return value;
}

function inferCause(msg, statusCode) {
  const m = String(msg || "").toLowerCase();
  if (m.includes("insufficient balance")) {
    return {
      cause: "Customer wallet does not have enough credit",
      fix: "Top up the customer's wallet from Admin → Customers.",
    };
  }
  if (m.includes("failed to fetch") || m.includes("network")) {
    return {
      cause: "Network/connectivity problem reaching backend or upstream",
      fix: "Check Apache, the systemd service, and outbound network access.",
    };
  }
  if (m.includes("upstream") || statusCode === 502 || statusCode === 503) {
    return {
      cause: "Upstream SMS API rejected or did not respond",
      fix: "Verify SMS_UPSTREAM_BASE_URL / SMS_UPSTREAM_API_KEY and check the upstream status from Admin → Diagnostics.",
    };
  }
  if (statusCode === 401 || statusCode === 403) {
    return { cause: "Authentication or authorization rejected", fix: "Re-check session token / API key." };
  }
  if (statusCode === 400 || m.includes("validation")) {
    return { cause: "Invalid input payload", fix: "Validate sender ID, recipient and route_option_id formats." };
  }
  return { cause: null, fix: null };
}

export async function logError({
  req,
  source,
  action,
  error,
  recipient = null,
  sender_id = null,
  message = null,
  route = null,
  route_option_id = null,
  status_code = null,
  extra = null,
}) {
  try {
    const customer_id = req?.user?.sub || null;
    const customer_email = req?.user?.email || null;
    const errorMessage = (error && (error.message || error.error)) || String(error || "Unknown error");
    const code = status_code ?? error?.status ?? null;
    const { cause, fix } = inferCause(errorMessage, code);

    const safe = scrub({
      ...(extra || {}),
      stack: error?.stack ? String(error.stack).split("\n").slice(0, 6).join("\n") : undefined,
    });

    // Sanitise provider branding from the message we persist & show to admins.
    const safeMessage = typeof errorMessage === "string" ? scrubBrand(errorMessage) : errorMessage;

    await pool.query(
      `INSERT INTO error_logs
         (customer_id, customer_email, source, action, recipient, sender_id, message,
          route, route_option_id, status_code, error_message, safe_details,
          likely_cause, suggested_solution)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14)`,
      [
        customer_id, customer_email, source, action, recipient, sender_id, message,
        route, route_option_id, code, safeMessage,
        JSON.stringify(safe || {}), cause, fix,
      ]
    );
  } catch (e) {
    // Never let error-logging itself break the request.
    console.error("[errorLogger] failed to persist error:", e?.message);
  }
}
