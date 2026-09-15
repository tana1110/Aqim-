// On-device mirror of memorized ranges and recitation history — the two
// inputs the suggestion engine needs besides the (static, bundled) Quran
// text itself. Lives in localStorage so recitation suggestions work with no
// account and no network; when signed in + online, /api/memorization and
// /api/history stay the server copy and this mirror is refreshed from them.

export interface MemoRange {
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
}

const MEMO_KEY = "aqim-memorization";

export function loadMemorization(): MemoRange[] {
  try {
    const raw = localStorage.getItem(MEMO_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveMemorization(list: MemoRange[]) {
  try {
    localStorage.setItem(MEMO_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("aqim-memo-changed"));
  } catch {}
}

export interface HistoryEntry {
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
  usedAt: number;
}

const HISTORY_KEY = "aqim-recitation-history";
const HISTORY_MAX = 300;

export function loadHistoryLocal(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function pushHistoryLocal(
  entries: { surahNumber: number; fromAyah: number; toAyah: number }[],
) {
  try {
    const list = loadHistoryLocal();
    const now = Date.now();
    for (const e of entries) list.unshift({ ...e, usedAt: now });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)));
  } catch {}
}
