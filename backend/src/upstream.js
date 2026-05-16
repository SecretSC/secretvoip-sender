// Server-side proxy to the upstream SMS provider.
// The API key NEVER leaves the backend.

const BASE = process.env.SMS_UPSTREAM_BASE_URL;
const KEY  = process.env.SMS_UPSTREAM_API_KEY;

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

async function call(path, init = {}) {
  if (!BASE || !KEY) throw new Error("Upstream SMS not configured");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
      ...(init.headers || {}),
    },
  });
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
    const p = { ...payload };
    if (p.route_option_id) p.route_option_id = toUpstreamOptionId(p.route_option_id);
    return call("/sms/send", { method: "POST", body: JSON.stringify(p) }).then(rebrandLabels);
  },
  routes: (expandGamma = true) =>
    call(`/sms/available-routes${expandGamma ? "?expand=gamma" : ""}`).then(rebrandLabels),
  logs: (qs) => call(`/sms/logs?${qs}`).then(rebrandLabels),
};

export { toUpstreamOptionId, toClientOptionId };
