// Daily wird (reading portion) + streak — stored on-device.
// Streak logic uses LOCAL CALENDAR DAYS (not 24h windows): completing every
// calendar day keeps the chain; missing a full calendar day breaks it.

export interface WirdConfig {
  enabled: boolean;
  pages: number; // pages per day
  time: string; // "HH:MM" local reminder time
}

const CFG_KEY = "aqim-wird";
const DONE_KEY = "aqim-wird-days"; // JSON array of local "YYYY-MM-DD"

export function defaultWird(): WirdConfig {
  return { enabled: false, pages: 2, time: "20:00" };
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
