import { prisma } from "@/lib/prisma";
import type { Mode } from "@/lib/prayers";

// A recitation unit: a contiguous range of ayahs within one surah.
export interface Passage {
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
}

export function passageKey(p: Passage): string {
  return `${p.surahNumber}:${p.fromAyah}-${p.toAyah}`;
}

interface SelectionSettings {
  noRepeatWindow: number;
  qiyamRepeatWindow: number;
  maxAyahShort: number;
}

// ---------------------------------------------------------------------------
// Candidate generation
// ---------------------------------------------------------------------------

// Break a memorized [from,to] range into recitation-sized candidate passages.
// - Fara'id/Nafl: short-to-medium units (whole short surahs, or chunks of the range).
// - Qiyam: longer units allowed.
function chunkRange(
  surahNumber: number,
  from: number,
  to: number,
  surahAyahCount: number,
  maxLen: number,
): Passage[] {
  const passages: Passage[] = [];
  const isWholeSurah = from === 1 && to === surahAyahCount;

  // A whole surah at or under the length limit is a natural single unit.
  if (isWholeSurah && surahAyahCount <= maxLen) {
    return [{ surahNumber, fromAyah: 1, toAyah: surahAyahCount }];
  }

  // Otherwise split the memorized span into consecutive chunks of up to maxLen.
  let start = from;
  while (start <= to) {
    const end = Math.min(start + maxLen - 1, to);
    passages.push({ surahNumber, fromAyah: start, toAyah: end });
    start = end + 1;
  }
  return passages;
}

async function buildCandidates(
  userId: number,
  mode: Mode,
  settings: SelectionSettings,
): Promise<Passage[]> {
  const [memorization, surahs] = await Promise.all([
    prisma.memorization.findMany({ where: { userId } }),
    prisma.surah.findMany(),
  ]);

  const ayahCountBySurah = new Map(surahs.map((s) => [s.number, s.ayahCount]));

  // Fara'id/Nafl favour short-to-medium; Qiyam allows longer passages.
  const maxLen = mode === "qiyam" ? 30 : settings.maxAyahShort;

  const candidates: Passage[] = [];
  for (const m of memorization) {
    const count = ayahCountBySurah.get(m.surahNumber);
    if (!count) continue; // unknown surah, skip defensively
    const to = Math.min(m.toAyah, count);
    const from = Math.max(1, m.fromAyah);
    if (from > to) continue;
    candidates.push(...chunkRange(m.surahNumber, from, to, count, maxLen));
  }
  return candidates;
}

// ---------------------------------------------------------------------------
// Anti-repetition
// ---------------------------------------------------------------------------

// Returns the set of passage keys used within the recent window, plus a map of
// passageKey -> most recent usage time (for least-recently-used fallback).
async function recentUsage(
  userId: number,
  mode: Mode,
  settings: SelectionSettings,
): Promise<{ recent: Set<string>; lastUsedAt: Map<string, number> }> {
  const window =
    mode === "qiyam" ? settings.qiyamRepeatWindow : settings.noRepeatWindow;

  // Pull enough recent history to cover the window generously (a prayer may log
  // more than one passage). We de-duplicate by passage below.
  const rows = await prisma.recitationHistory.findMany({
    where: { userId },
    orderBy: { usedAt: "desc" },
    take: Math.max(window * 4, 40),
  });

  const lastUsedAt = new Map<string, number>();
  const orderedDistinct: string[] = [];
  for (const r of rows) {
    const key = passageKey(r);
    if (!lastUsedAt.has(key)) {
      lastUsedAt.set(key, r.usedAt.getTime());
      orderedDistinct.push(key);
    }
  }

  // The "recent" set = the most recent `window` DISTINCT passages.
  const recent = new Set(orderedDistinct.slice(0, window));
  return { recent, lastUsedAt };
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

export interface SelectionResult {
  passages: Passage[];
  relaxed: boolean; // true if the anti-repeat window had to be relaxed
  exhausted: boolean; // true if there aren't enough distinct candidates at all
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Select `count` DISTINCT passages for the "suggest" slots of a prayer.
// Guarantees a result whenever the user has any memorization at all — even if
// they only memorized a few very short surahs (anti-repeat is relaxed as needed).
export async function selectPassages(
  userId: number,
  mode: Mode,
  count: number,
  settings: SelectionSettings,
  exclude: Passage[] = [],
): Promise<SelectionResult> {
  const candidates = await buildCandidates(userId, mode, settings);
  if (candidates.length === 0) {
    return { passages: [], relaxed: false, exhausted: true };
  }

  const { recent, lastUsedAt } = await recentUsage(userId, mode, settings);
  const excludeKeys = new Set(exclude.map(passageKey));

  // De-duplicate candidate passages by key.
  const byKey = new Map<string, Passage>();
  for (const c of candidates) byKey.set(passageKey(c), c);
  const uniqueCandidates = [...byKey.values()];

  const chosen: Passage[] = [];
  const chosenKeys = new Set<string>(excludeKeys);
  let relaxed = false;

  while (chosen.length < count) {
    // Tier 1: not used in the recent window and not already chosen/excluded.
    let pool = uniqueCandidates.filter(
      (c) => !recent.has(passageKey(c)) && !chosenKeys.has(passageKey(c)),
    );

    // Tier 2 (relaxed): allow recently-used, prefer least-recently-used first.
    if (pool.length === 0) {
      relaxed = true;
      pool = uniqueCandidates.filter((c) => !chosenKeys.has(passageKey(c)));
      if (pool.length === 0) break; // genuinely no more distinct candidates
      // Sort by last-used ascending (never-used = 0 sorts first).
      pool.sort(
        (a, b) =>
          (lastUsedAt.get(passageKey(a)) ?? 0) -
          (lastUsedAt.get(passageKey(b)) ?? 0),
      );
      const pick = pool[0];
      chosen.push(pick);
      chosenKeys.add(passageKey(pick));
      continue;
    }

    const pick = pickRandom(pool);
    chosen.push(pick);
    chosenKeys.add(passageKey(pick));
  }

  return {
    passages: chosen,
    relaxed,
    exhausted: chosen.length < count,
  };
}
