// Daily wird (reading portion) + streak — stored on-device.
// Streak logic uses LOCAL CALENDAR DAYS (not 24h windows): completing every
// calendar day keeps the chain; missing a full calendar day breaks it.

export type WirdMode = "pages" | "surah" | "minutes";

export interface WirdConfig {
  enabled: boolean;
  mode: WirdMode; // portion defined by pages, a surah, or minutes of reading
  pages: number; // pages per day (mode: pages)
  surahNumbers: number[]; // (mode: surah) — one or MANY surahs
  minutes: number; // (mode: minutes)
  time: string; // "HH:MM" local reminder time
}

const CFG_KEY = "aqim-wird";
const DONE_KEY = "aqim-wird-days"; // JSON array of local "YYYY-MM-DD"

export function defaultWird(): WirdConfig {
  return {
    enabled: false,
    mode: "pages",
    pages: 2,
    surahNumbers: [],
    minutes: 15,
    time: "20:00",
  };
}

export function loadWird(): WirdConfig {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const cfg = { ...defaultWird(), ...parsed };
      if (!Array.isArray(cfg.surahNumbers)) cfg.surahNumbers = [];
      if (parsed.surahNumber && !cfg.surahNumbers.includes(parsed.surahNumber))
        cfg.surahNumbers.push(parsed.surahNumber);
      return cfg;
    }
  } catch {}
  return defaultWird();
}

export function saveWird(cfg: WirdConfig) {
  try {
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
    window.dispatchEvent(new Event("aqim-wird-changed"));
  } catch {}
}

const ADHKAR_KEY = "aqim-adhkar-days";

// Local calendar date key (user's timezone).
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadDays(): Set<string> {
  try {
    const raw = localStorage.getItem(DONE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

export function isDoneToday(): boolean {
  return loadDays().has(dayKey());
}

export function markDoneToday() {
  const days = loadDays();
  days.add(dayKey());
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify([...days].sort().slice(-400)));
    window.dispatchEvent(new Event("aqim-wird-changed"));
  } catch {}
}

// Consecutive completed calendar days ending today (or ending yesterday when
// today isn't done yet — today still being "in progress" must not reset it).
export function currentStreak(): number {
  const days = loadDays();
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1); // grace: today not done yet
    if (!days.has(dayKey(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}
function saveSet(key: string, days: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...days].sort().slice(-400)));
    window.dispatchEvent(new Event("aqim-wird-changed"));
  } catch {}
}

export function isAdhkarDoneToday(): boolean {
  return loadSet(ADHKAR_KEY).has(dayKey());
}
export function markAdhkarDoneToday() {
  const d = loadSet(ADHKAR_KEY);
  d.add(dayKey());
  saveSet(ADHKAR_KEY, d);
}

// ---------------------------------------------------------------------------
// Mushaf pages actually read today — auto-credits a pages-mode wird.
// ---------------------------------------------------------------------------
const READ_PREFIX = "aqim-wird-read:";

export function pagesReadToday(): number {
  try {
    const raw = localStorage.getItem(READ_PREFIX + dayKey());
    return raw ? (JSON.parse(raw) as number[]).length : 0;
  } catch {
    return 0;
  }
}

// Record a viewed page; returns true if this completed today's pages-mode
// wird (which is then auto-marked done).
export function recordPageRead(page: number): boolean {
  try {
    const key = READ_PREFIX + dayKey();
    const set = new Set<number>(JSON.parse(localStorage.getItem(key) ?? "[]"));
    set.add(page);
    localStorage.setItem(key, JSON.stringify([...set]));
    const cfg = loadWird();
    if (
      cfg.enabled &&
      cfg.mode === "pages" &&
      set.size >= cfg.pages &&
      !isDoneToday()
    ) {
      markDoneToday();
      return true;
    }
    window.dispatchEvent(new Event("aqim-wird-changed"));
  } catch {}
  return false;
}

function readTodaySet(): Set<number> {
  try {
    return new Set(
      JSON.parse(localStorage.getItem(READ_PREFIX + dayKey()) ?? "[]"),
    );
  } catch {
    return new Set();
  }
}

// Surah-mode wird: how many of the chosen surahs' Mushaf pages were read
// today. The wird can ONLY complete by actually finishing this reading.
export interface SurahSpan {
  number: number;
  firstPage?: number | null;
  lastPage?: number | null;
}

export function surahWirdProgress(spans: SurahSpan[]): {
  read: number;
  total: number;
} {
  const cfg = loadWird();
  const required = new Set<number>();
  for (const n of cfg.surahNumbers) {
    const s = spans.find((x) => x.number === n);
    if (!s || s.firstPage == null || s.lastPage == null) continue;
    for (let p = s.firstPage; p <= s.lastPage; p++) required.add(p);
  }
  const read = readTodaySet();
  let done = 0;
  for (const p of required) if (read.has(p)) done++;
  return { read: done, total: required.size };
}

// Marks a surah-mode wird done when every required page has been read.
export function maybeCompleteSurahWird(spans: SurahSpan[]): boolean {
  const cfg = loadWird();
  if (!cfg.enabled || cfg.mode !== "surah" || isDoneToday()) return false;
  const { read, total } = surahWirdProgress(spans);
  if (total > 0 && read >= total) {
    markDoneToday();
    return true;
  }
  return false;
}

// The current week (last 7 local days, oldest→today) as done/not-done flags.
function weekOf(key: string): boolean[] {
  const days = loadSet(key);
  const out: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(days.has(dayKey(d)));
  }
  return out;
}
export const wirdWeek = () => weekOf(DONE_KEY);
export const adhkarWeek = () => weekOf(ADHKAR_KEY);
