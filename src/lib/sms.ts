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

export function parseRecipients(input: string): string[] {
  return input
    .split(/[\s,;]+/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^\+/, ""));
}

export function maskKey(k?: string) {
  if (!k) return "•••• •••• ••••";
  if (k.length < 8) return "••••" + k.slice(-2);
  return k.slice(0, 4) + " •••• •••• " + k.slice(-4);
}
