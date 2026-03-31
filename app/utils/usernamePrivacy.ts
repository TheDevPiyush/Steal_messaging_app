/** 8-digit suffix for privacy handles: `base_12345678` */
export function randomEightDigits() {
  return String(Math.floor(10_000_000 + Math.random() * 90_000_000));
}

/** Sanitize the base part the user types (before we append _12345678). */
export function sanitizeUsernameBase(raw: string) {
  return raw.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 24);
}

export function buildPrivacyUsername(base: string, suffix: string) {
  const b = sanitizeUsernameBase(base);
  if (b.length < 2) return "";
  return `${b}_${suffix}`;
}
