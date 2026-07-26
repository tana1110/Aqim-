// Daily wird (reading portion) + streak — stored on-device.
// Streak logic uses LOCAL CALENDAR DAYS (not 24h windows): completing every
// calendar day keeps the chain; missing a full calendar day breaks it.

export type WirdMode = "pages" | "surah" | "minutes";

export interface WirdConfig {
  enabled: boolean;
  mode: WirdMode; // portion defined by pages, a surah, or minutes of reading
  pages: number; // pages per day (mode: pages)
  surahNumber: number | null; // (mode: surah)
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
    surahNumber: null,
    minutes: 15,
    time: "20:00",
  };
}

export function loadWird(): WirdConfig {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (raw) return { ...defaultWird(), ...JSON.parse(raw) };
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
