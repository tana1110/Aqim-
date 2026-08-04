// Hourglass streak — tunable constants (server + client share these).
// Reading ONE page adds EXTEND_HOURS to the streak clock (capped at
// MAX_BUFFER_HOURS ahead). If the clock runs out, the streak resets.
// A warning push fires when WARN_MINUTES remain.
export const STREAK_EXTEND_HOURS = 8;
export const STREAK_MAX_BUFFER_HOURS = 48;
export const STREAK_WARN_MINUTES = 60;

export interface StreakState {
  count: number;
  expiresAt: number | null; // epoch ms
}

const KEY = "aqim-streak";

export function loadStreakCache(): StreakState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as StreakState;
      return { count: Number(p.count) || 0, expiresAt: p.expiresAt ?? null };
    }
  } catch {}
  return { count: 0, expiresAt: null };
}

export function saveStreakCache(s: StreakState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new Event("aqim-streak-changed"));
  } catch {}
}

// Effective (client-side) view: an expired clock means the streak is 0.
export function effectiveStreak(s: StreakState): StreakState {
  if (s.expiresAt != null && s.expiresAt < Date.now()) {
    return { count: 0, expiresAt: null };
  }
  return s;
}

export function formatRemaining(
  expiresAt: number,
  lang: "ar" | "en",
): string {
  const ms = Math.max(0, expiresAt - Date.now());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const digits = (n: number) =>
    lang === "ar"
      ? String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)])
      : String(n);
  return lang === "ar" ? `${digits(h)}س ${digits(m)}د` : `${digits(h)}h ${digits(m)}m`;
}
