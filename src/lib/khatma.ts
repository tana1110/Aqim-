// Adaptive khatma (Quran-completion) plan. Unlike the plain daily wird
// target, this tracks CUMULATIVE progress since the plan started and
// recomputes the required daily pace from whatever is actually left —
// read ahead one day and tomorrow's target drops by itself; fall behind
// and it rises. Progress is the furthest Mushaf page reached (a
// watermark, never regresses on re-reading earlier pages).
import { dayKey, loadWird, saveWird } from "@/lib/wird";

const TOTAL_PAGES = 604;

export interface KhatmaPlan {
  targetDays: number;
  startDayKey: string; // local "YYYY-MM-DD" the plan began
  startPage: number; // Mushaf page it starts counting from (usually 1)
}

const PLAN_KEY = "aqim-khatma";
const PROGRESS_KEY = "aqim-khatma-furthest";

export function loadKhatmaPlan(): KhatmaPlan | null {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function startKhatma(targetDays: number, startPage = 1) {
  try {
    const plan: KhatmaPlan = {
      targetDays: Math.max(1, targetDays),
      startDayKey: dayKey(),
      startPage: Math.max(1, startPage),
    };
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
    localStorage.setItem(PROGRESS_KEY, String(plan.startPage - 1));
    // The khatma drives the wird's daily page target from here on — force
    // pages mode so "today's wird" tracks the same pace the khatma needs.
    const w = loadWird();
    saveWird({ ...w, enabled: true, mode: "pages" });
    syncWirdPaceToKhatma();
    window.dispatchEvent(new Event("aqim-khatma-changed"));
  } catch {}
}

// Keeps the wird's daily page count matched to whatever the khatma
// actually needs right now — read ahead today and this lowers tomorrow's
// number by itself; fall behind and it rises. Called after every page
// read and whenever the plan changes, so it's never stale.
export function syncWirdPaceToKhatma() {
  const status = khatmaStatus();
  if (!status || status.finished) return;
  const w = loadWird();
  if (w.mode !== "pages") return;
  if (w.pages !== status.pagesPerDayNeeded) {
    saveWird({ ...w, pages: Math.max(1, status.pagesPerDayNeeded) });
  }
}

export function stopKhatma() {
  try {
    localStorage.removeItem(PLAN_KEY);
    localStorage.removeItem(PROGRESS_KEY);
    window.dispatchEvent(new Event("aqim-khatma-changed"));
  } catch {}
}

// Called whenever a Mushaf page is viewed. Only moves the watermark
// forward — flipping back to re-read something already covered doesn't
// undo progress.
export function markKhatmaPage(page: number) {
  try {
    const plan = loadKhatmaPlan();
    if (!plan) return;
    const cur = Number(localStorage.getItem(PROGRESS_KEY) ?? plan.startPage - 1);
    if (page > cur) {
      localStorage.setItem(PROGRESS_KEY, String(page));
      syncWirdPaceToKhatma();
      window.dispatchEvent(new Event("aqim-khatma-changed"));
    }
  } catch {}
}

function daysBetween(fromKey: string, toKey: string): number {
  const [ay, am, ad] = fromKey.split("-").map(Number);
  const [by, bm, bd] = toKey.split("-").map(Number);
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.round((b - a) / 86_400_000);
}

export interface KhatmaStatus {
  plan: KhatmaPlan;
  pagesRead: number;
  pagesLeft: number;
  daysElapsed: number;
  daysLeft: number;
  pagesPerDayNeeded: number; // recomputed fresh from what's actually left
  aheadBy: number; // pages ahead (+) or behind (-) the original flat pace
  finished: boolean;
}

export function khatmaStatus(): KhatmaStatus | null {
  const plan = loadKhatmaPlan();
  if (!plan) return null;

  const totalPages = TOTAL_PAGES - (plan.startPage - 1);
  const furthest = Number(
    localStorage.getItem(PROGRESS_KEY) ?? plan.startPage - 1,
  );
  const pagesRead = Math.max(0, furthest - (plan.startPage - 1));
  const pagesLeft = Math.max(0, totalPages - pagesRead);
  const daysElapsed = Math.max(0, daysBetween(plan.startDayKey, dayKey()));
  const daysLeft = Math.max(1, plan.targetDays - daysElapsed);
  const finished = pagesLeft === 0;

  const flatPacePerDay = totalPages / plan.targetDays;
  const expectedByNow = Math.min(totalPages, flatPacePerDay * daysElapsed);

  return {
    plan,
    pagesRead,
    pagesLeft,
    daysElapsed,
    daysLeft,
    pagesPerDayNeeded: finished ? 0 : Math.ceil(pagesLeft / daysLeft),
    aheadBy: Math.round(pagesRead - expectedByNow),
    finished,
  };
}
