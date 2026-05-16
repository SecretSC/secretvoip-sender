// Shared client-side sender ID validation. Mirrors backend rules so the UI
// can disable Send/Test buttons and surface a friendly error before a
// request is ever made. Backend still enforces the same rules.

export const SENDER_ID_HELP =
  "2-11 characters. Letters, numbers and  . _ - allowed.";

export type SenderCheck = { ok: true; value: string } | { ok: false; message: string };

export function validateSenderId(raw: string | undefined | null): SenderCheck {
  if (typeof raw !== "string") return { ok: false, message: "Sender ID is required" };
  const v = raw.trim();
  if (!v) return { ok: false, message: "Sender ID is required" };
  if (v.length < 2 || v.length > 11) return { ok: false, message: "Sender ID must be 2-11 characters" };
  if (!/^[A-Za-z0-9 ._-]+$/.test(v))
    return { ok: false, message: "Only letters, numbers, space, dot, underscore or dash" };
  return { ok: true, value: v };
}

export function isSenderIdValid(raw: string | undefined | null) {
  return validateSenderId(raw).ok;
}
