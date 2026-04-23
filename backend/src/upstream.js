// Server-side proxy to the upstream SMS provider.
// The API key NEVER leaves the backend.

const BASE = process.env.SMS_UPSTREAM_BASE_URL;
const KEY  = process.env.SMS_UPSTREAM_API_KEY;

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
    const err = new Error(body?.message || `Upstream error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

export const upstream = {
  send: (payload) => call("/sms/send", { method: "POST", body: JSON.stringify(payload) }),
  routes: (expandGamma = true) => call(`/sms/available-routes${expandGamma ? "?expand=gamma" : ""}`),
  logs: (qs) => call(`/sms/logs?${qs}`),
};
