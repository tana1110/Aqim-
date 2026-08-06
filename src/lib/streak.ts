// Daily streak — the real daily reading (the wird, or one page when no
// wird is set) saves the day, deadline at local midnight. Nothing
// accumulates. Mercy ladder when a day is about to be missed:
//   1. last hour before midnight — even ONE page saves the night;
//   2. the one-hour "spark" window after midnight — one page rescues it;
//   3. rukhsa shields — earned protections (one per 7 streak days, max
//      2 stored) that auto-cover a fully missed day.
// Shared by server and client (all functions are pure; tzOffsetMin is
// minutes AHEAD of UTC, i.e. -new Date().getTimezoneOffset()).
export const STREAK_GRACE_MINUTES = 60;
export const SHIELD_EVERY_DAYS = 7;
export const SHIELD_MAX = 2;

export interface StreakState {
  count: number;
  lastDay: string | null; // local day key "YYYY-M-D" of the last counted day
  shields: number; // unspent rukhsa protections
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

// Settle the streak at a moment in time: still alive, saved by the
// spark hour, bridged by spending shields, or broken. `spent` says how
// many shields this evaluation consumed (callers persist that).
export interface StreakEval extends StreakState {
  spent: number;
}

export function evaluateStreak(
  s: StreakState,
  now: number,
  tzOffsetMin: number,
): StreakEval {
  const shields = s.shields ?? 0;
  if (!s.lastDay || s.count <= 0) {
    return { count: 0, lastDay: null, shields, spent: 0 };
  }
  const today = localDayKey(now, tzOffsetMin);
  const todayStart = dayStartMs(today, tzOffsetMin);
  // fully-missed days strictly between the last read day and today
  const gap =
    Math.round((todayStart - dayStartMs(s.lastDay, tzOffsetMin)) / 86_400_000) -
    1;
  if (gap <= 0) return { count: s.count, lastDay: s.lastDay, shields, spent: 0 };
  if (gap === 1 && now < todayStart + STREAK_GRACE_MINUTES * 60_000) {
    // the spark hour is still running — no shield needed yet
    return { count: s.count, lastDay: s.lastDay, shields, spent: 0 };
  }
  if (gap <= shields) {
    // rukhsa: shields silently cover the missed days; today stays open
    const yesterday = localDayKey(todayStart - 43_200_000, tzOffsetMin);
    return {
      count: s.count,
      lastDay: yesterday,
      shields: shields - gap,
      spent: gap,
    };
  }
  return { count: 0, lastDay: null, shields, spent: 0 };
}

export type StreakPhase = "none" | "done" | "open" | "grace";

export interface StreakStatus {
  count: number;
  phase: StreakPhase;
  // "open": tonight's midnight. "grace": end of the spark hour.
  deadline: number | null;
  shields: number;
}

export function streakStatus(
  s: StreakState,
  now: number,
  tzOffsetMin: number,
): StreakStatus {
  const ev = evaluateStreak(s, now, tzOffsetMin);
  if (!ev.lastDay || ev.count <= 0) {
    return { count: 0, phase: "none", deadline: null, shields: ev.shields };
  }
  const today = localDayKey(now, tzOffsetMin);
  if (ev.lastDay === today) {
    return { count: ev.count, phase: "done", deadline: null, shields: ev.shields };
  }
  const todayStart = dayStartMs(today, tzOffsetMin);
  if (todayStart - dayStartMs(ev.lastDay, tzOffsetMin) >= 2 * 86_400_000) {
    // midnight already passed with nothing read — the spark hour is running
    return {
      count: ev.count,
      phase: "grace",
      deadline: todayStart + STREAK_GRACE_MINUTES * 60_000,
      shields: ev.shields,
    };
  }
  // normal day: the reading is still owed before tonight's midnight
  return {
    count: ev.count,
    phase: "open",
    deadline: todayStart + 86_400_000,
    shields: ev.shields,
  };
}

// Does reading a page at this moment save the day? Always, when there is
// no wird (or it's already done — keeps the day marked). With a wird
// still owed, only the mercy window: the last hour before midnight and
// the spark hour after it (23:00–01:00 local).
export function pageCountsToday(
  wirdEnabled: boolean,
  wirdDone: boolean,
  now: number = Date.now(),
): boolean {
  if (!wirdEnabled || wirdDone) return true;
  const h = new Date(now).getHours();
  return h === 23 || h === 0;
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
        shields: Number(p.shields) || 0,
      };
    }
  } catch {}
  return { count: 0, lastDay: null, shields: 0 };
}

// Report the day as saved to the server and mirror the reply locally.
export function postStreak() {
  fetch("/api/streak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tzOffset: -new Date().getTimezoneOffset() }),
  })
    .then((r) => r.json())
    .then((d) => {
      if (typeof d.count === "number") {
        saveStreakCache({
          count: d.count,
          lastDay: d.lastDay ?? null,
          shields: Number(d.shields) || 0,
        });
      }
    })
    .catch(() => {});
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
