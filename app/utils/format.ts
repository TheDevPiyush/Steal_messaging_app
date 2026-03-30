export function formatTimeOfDay(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;

  const mm = String(m).padStart(2, "0");
  const ss = String(rem).padStart(2, "0");

  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

export function toIsoStringSafe(d: Date) {
  // Ensure stable ISO format for cursor comparisons.
  return new Date(d.getTime()).toISOString();
}

