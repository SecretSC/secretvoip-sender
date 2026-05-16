// SMS helpers: segment estimation, recipient parsing, GSM-7 vs UCS-2 detection.

const GSM7_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\u001bÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXT = "^{}\\[~]|€";

export function isGsm7(text: string) {
  for (const c of text) {
    if (GSM7_BASIC.indexOf(c) === -1 && GSM7_EXT.indexOf(c) === -1) return false;
  }
  return true;
}

export function estimateSegments(text: string) {
  if (!text) return 0;
  const gsm = isGsm7(text);
  // length counting (extended chars count as 2 in GSM-7)
  let len = 0;
  if (gsm) {
    for (const c of text) len += GSM7_EXT.indexOf(c) >= 0 ? 2 : 1;
    if (len <= 160) return 1;
    return Math.ceil(len / 153);
  } else {
    len = [...text].length;
    if (len <= 70) return 1;
    return Math.ceil(len / 67);
  }
}

// Normalise a single recipient to E.164 (`+` followed by digits).
// The upstream provider rejects bare national-format numbers (e.g. `4522304047`)
// per-message with `status: "failed"` even though the HTTP call returns 2xx.
export function toE164(raw: string): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  // Keep a leading +, strip everything else that isn't a digit.
  const hasPlus = s.startsWith("+") || s.startsWith("00");
  const digits = s.replace(/[^\d]/g, "").replace(/^0+/, (m) => (s.startsWith("00") ? "" : m));
  if (!digits) return "";
  return hasPlus ? `+${digits}` : `+${digits}`;
}

export function parseRecipients(input: string): string[] {
  return input
    .split(/[\s,;]+/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(toE164)
    .filter(Boolean);
}

export function maskKey(k?: string) {
  if (!k) return "•••• •••• ••••";
  if (k.length < 8) return "••••" + k.slice(-2);
  return k.slice(0, 4) + " •••• •••• " + k.slice(-4);
}
