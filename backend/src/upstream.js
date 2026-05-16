// Server-side proxy to the upstream SMS provider.
// The API key NEVER leaves the backend.

const BASE = (process.env.SMS_UPSTREAM_BASE_URL || "").trim().replace(/\/+$/, "");
// Trim accidental whitespace/quotes from env (common when copy-pasted into
// systemd EnvironmentFile) — these silently break Bearer auth otherwise.
const KEY  = (process.env.SMS_UPSTREAM_API_KEY || "")
  .trim()
  .replace(/^['"]|['"]$/g, "");

// Some upstream providers expect a non-Bearer header (e.g. `X-API-Key: <key>`).
// Defaults preserve the previously-working `Authorization: Bearer <key>` behavior.
// Override via env without code changes:
//   SMS_UPSTREAM_AUTH_HEADER=X-API-Key
//   SMS_UPSTREAM_AUTH_PREFIX=        (empty string for raw key, no "Bearer ")
const AUTH_HEADER = (process.env.SMS_UPSTREAM_AUTH_HEADER || "Authorization").trim();
const AUTH_PREFIX = process.env.SMS_UPSTREAM_AUTH_PREFIX != null
  ? process.env.SMS_UPSTREAM_AUTH_PREFIX
  : "Bearer ";

// --- Provider abstraction layer ---------------------------------------------
// The upstream provider exposes route option_ids that contain its brand name
// (e.g. "epsilon-ttsky-3"). We expose neutral ids to the client
// ("epsilon-sub-3") and translate transparently here so the brand never
// reaches the frontend in any network request, response, or log.
function toUpstreamOptionId(id) {
  if (!id) return id;
  return String(id).replace(/^epsilon-sub-(\d+)$/i, "epsilon-ttsky-$1");
}
function toClientOptionId(id) {
  if (!id) return id;
  return String(id).replace(/^epsilon-ttsky-(\d+)$/i, "epsilon-sub-$1");
}
function rebrandLabels(value) {
  if (Array.isArray(value)) return value.map(rebrandLabels);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === "option_id" && typeof v === "string") out[k] = toClientOptionId(v);
      else if (typeof v === "string") {
        out[k] = v.replace(/ttsky/gi, "Sub").replace(/skytelecom/gi, "Provider");
      } else out[k] = rebrandLabels(v);
    }
    return out;
  }
  return value;
}

const UPSTREAM_TIMEOUT_MS = Number(process.env.SMS_UPSTREAM_TIMEOUT_MS || 20_000);

async function call(path, init = {}) {
  if (!BASE || !KEY) throw new Error("Upstream SMS not configured");
  // Hard timeout so a hung upstream cannot pin a request (and its DB client)
  // forever, which would otherwise starve the pool and block /api/auth/login.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        [AUTH_HEADER]: `${AUTH_PREFIX}${KEY}`,
        ...(init.headers || {}),
      },
    });
  } catch (e) {
    clearTimeout(timer);
    if (e?.name === "AbortError") {
      const err = new Error("Upstream timed out");
      err.status = 504;
      throw err;
    }
    throw e;
  }
  clearTimeout(timer);
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = { raw: text }; }
  if (!res.ok) {
    const rawMsg = body?.message || `Upstream error ${res.status}`;
    const safeMsg = String(rawMsg)
      .replace(/ttsky/gi, "Sub")
      .replace(/skytelecom/gi, "Provider");
    const err = new Error(safeMsg);
    err.status = res.status;
    throw err;
  }
  return body;
}

export const upstream = {
  send: (payload) => {
    // Final fail-safe: even if a future caller forgets to validate,
    // refuse to build the upstream request without a usable sender_id.
    // This guarantees we NEVER leak the upstream provider's default sender.
    const s = typeof payload?.sender_id === "string" ? payload.sender_id.trim() : "";
    if (!s || s.length < 2 || s.length > 11 || !/^[A-Za-z0-9 ._-]+$/.test(s)) {
      const err = new Error("Sender ID is required");
      err.status = 400;
      throw err;
    }
    const p = { ...payload, sender_id: s };
    if (p.route_option_id) p.route_option_id = toUpstreamOptionId(p.route_option_id);
    return call("/sms/send", { method: "POST", body: JSON.stringify(p) }).then(rebrandLabels);
  },
  routes: (expandGamma = true) =>
    call(`/sms/available-routes${expandGamma ? "?expand=gamma" : ""}`).then(rebrandLabels),
  logs: (qs) => call(`/sms/logs?${qs}`).then(rebrandLabels),
};

export { toUpstreamOptionId, toClientOptionId };
