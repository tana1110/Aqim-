// Daily streak — one page a day, deadline at local midnight.
// Reading a page marks the day done; nothing accumulates. If midnight
// passes without a page, a one-hour "spark" rescue window opens: reading
// one page during it saves the streak. After that, the streak resets.
// Shared by server and client (all functions are pure; tzOffsetMin is
// minutes AHEAD of UTC, i.e. -new Date().getTimezoneOffset()).
export const STREAK_GRACE_MINUTES = 60;

export interface StreakState {
  count: number;
  lastDay: string | null; // local day key "YYYY-M-D" of the last counted day
}

// Local calendar day for an instant, e.g. "2026-8-5".
export function localDayKey(now: number, tzOffsetMin: number): string {
  const d = new Date(now + tzOffsetMin * 60_000);
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

// Epoch ms of local midnight that STARTS the given day key.
export function dayStartMs(dayKey: string, tzOffsetMin: number): number {
  const [y, m, d] = dayKey.split("-").map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1) - tzOffsetMin * 60_000;
}

// The streak survives until the end of the day AFTER the last read day,
// plus the spark hour. (Read on day D → must read again during D+1;
// D+1 ends at midnight; the spark stretches that to 01:00 of D+2.)
export function streakAlive(
  lastDay: string | null,
  now: number,
  tzOffsetMin: number,
): boolean {
  if (!lastDay) return false;
  const deadline =
    dayStartMs(lastDay, tzOffsetMin) +
    2 * 86_400_000 +
    STREAK_GRACE_MINUTES * 60_000;
  return now < deadline;
}

export type StreakPhase = "none" | "done" | "open" | "grace";

export interface StreakStatus {
  count: number;
  phase: StreakPhase;
  // "open": tonight's midnight. "grace": end of the spark hour.
  deadline: number | null;
}

export function streakStatus(
  s: StreakState,
  now: number,
  tzOffsetMin: number,
): StreakStatus {
  if (!s.lastDay || s.count <= 0 || !streakAlive(s.lastDay, now, tzOffsetMin)) {
    return { count: 0, phase: "none", deadline: null };
  }
  const today = localDayKey(now, tzOffsetMin);
  if (s.lastDay === today) {
    return { count: s.count, phase: "done", deadline: null };
  }
  const todayStart = dayStartMs(today, tzOffsetMin);
  if (todayStart - dayStartMs(s.lastDay, tzOffsetMin) >= 2 * 86_400_000) {
    // midnight already passed with no page — the spark hour is running
    return {
      count: s.count,
      phase: "grace",
      deadline: todayStart + STREAK_GRACE_MINUTES * 60_000,
    };
  }
  // normal day: a page is still owed before tonight's midnight
  return { count: s.count, phase: "open", deadline: todayStart + 86_400_000 };
}

const KEY = "aqim-streak";

export function loadStreakCache(): StreakState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as StreakState;
      return {
        count: Number(p.count) || 0,
        lastDay: typeof p.lastDay === "string" ? p.lastDay : null,
      };
    }
  } catch {}
  return { count: 0, lastDay: null };
}

export function saveStreakCache(s: StreakState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new Event("aqim-streak-changed"));
  } catch {}
}

// Client-side convenience: status in the device's own timezone.
export function clientStreakStatus(s: StreakState): StreakStatus {
  return streakStatus(s, Date.now(), -new Date().getTimezoneOffset());
}

export function formatRemaining(
  deadline: number,
  lang: "ar" | "en",
): string {
  const ms = Math.max(0, deadline - Date.now());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const digits = (n: number) =>
    lang === "ar"
      ? String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)])
      : String(n);
  if (h <= 0) return lang === "ar" ? `${digits(m)}د` : `${digits(m)}m`;
  return lang === "ar" ? `${digits(h)}س ${digits(m)}د` : `${digits(h)}h ${digits(m)}m`;
}
