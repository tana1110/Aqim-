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

// A temporary review spotlight (from the History screen's focus mode): prefer
// passages inside this range, optionally allowing intentional repetition.
export interface FocusSpec {
  surahNumber: number;
  fromAyah: number | null;
  toAyah: number | null;
  repeat: boolean;
  chunk: number;
}

// A candidate passage carries its approximate recitation length (word count),
// used to balance passage lengths across the rak'ahs of one prayer.
interface Candidate extends Passage {
  words: number;
}

function countWords(text: string): number {
  return text
    .replace(/^﻿/, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
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
): Promise<Candidate[]> {
  const [memorization, surahs] = await Promise.all([
    prisma.memorization.findMany({ where: { userId } }),
    prisma.surah.findMany(),
  ]);

  const ayahCountBySurah = new Map(surahs.map((s) => [s.number, s.ayahCount]));

  // Load per-ayah word counts for just the memorized surahs, so each candidate
  // can be sized by recitation length (words), not raw ayah count.
  const memoSurahNums = [...new Set(memorization.map((m) => m.surahNumber))];
  const ayahRows = memoSurahNums.length
    ? await prisma.quranText.findMany({
        where: { surahNumber: { in: memoSurahNums } },
        select: { surahNumber: true, ayahNumber: true, arabicText: true },
      })
    : [];
  const wordsByAyah = new Map<string, number>();
  for (const r of ayahRows) {
    wordsByAyah.set(`${r.surahNumber}:${r.ayahNumber}`, countWords(r.arabicText));
  }

  // Fara'id/Nafl favour short-to-medium; Qiyam allows longer passages.
  const maxLen = mode === "qiyam" ? 30 : settings.maxAyahShort;

  const candidates: Candidate[] = [];
  for (const m of memorization) {
    const count = ayahCountBySurah.get(m.surahNumber);
    if (!count) continue; // unknown surah, skip defensively
    const to = Math.min(m.toAyah, count);
    const from = Math.max(1, m.fromAyah);
    if (from > to) continue;
    for (const ch of chunkRange(m.surahNumber, from, to, count, maxLen)) {
      let words = 0;
      for (let a = ch.fromAyah; a <= ch.toAyah; a++) {
        words += wordsByAyah.get(`${ch.surahNumber}:${a}`) ?? 0;
      }
      candidates.push({ ...ch, words: Math.max(1, words) });
    }
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
  focus: FocusSpec | null = null,
): Promise<SelectionResult> {
  let candidates = await buildCandidates(userId, mode, settings);
  if (candidates.length === 0) {
    return { passages: [], relaxed: false, exhausted: true };
  }

  // Focus mode: additionally offer chunks cut to the focused range at the
  // requested size, and mark which candidates fall inside the spotlight.
  const inFocus = (c: Candidate) =>
    !!focus &&
    c.surahNumber === focus.surahNumber &&
    (focus.fromAyah == null || c.fromAyah >= focus.fromAyah) &&
    (focus.toAyah == null || c.toAyah <= focus.toAyah);

  if (focus) {
    const base = candidates.filter((c) => c.surahNumber === focus.surahNumber);
    if (base.length > 0) {
      const lo =
        focus.fromAyah ?? Math.min(...base.map((c) => c.fromAyah));
      const hi = focus.toAyah ?? Math.max(...base.map((c) => c.toAyah));
      const wordsAt = new Map<string, number>();
      for (const c of base) {
        const per = c.words / (c.toAyah - c.fromAyah + 1);
        for (let a = c.fromAyah; a <= c.toAyah; a++) {
          wordsAt.set(`${a}`, per);
        }
      }
      const size = Math.max(1, focus.chunk);
      const extra: Candidate[] = [];
      for (let start = lo; start <= hi; start += size) {
        const end = Math.min(start + size - 1, hi);
        let words = 0;
        for (let a = start; a <= end; a++) words += wordsAt.get(`${a}`) ?? 3;
        extra.push({
          surahNumber: focus.surahNumber,
          fromAyah: start,
          toAyah: end,
          words: Math.max(1, Math.round(words)),
        });
      }
      candidates = [...candidates, ...extra];
    }
  }

  const { recent, lastUsedAt } = await recentUsage(userId, mode, settings);
  const excludeKeys = new Set(exclude.map(passageKey));

  // De-duplicate candidate passages by key.
  const byKey = new Map<string, Candidate>();
  for (const c of candidates) byKey.set(passageKey(c), c);
  const uniqueCandidates = [...byKey.values()];

  const chosen: Candidate[] = [];
  const chosenKeys = new Set<string>(excludeKeys);
  let relaxed = false;

  const isFresh = (c: Candidate) => !recent.has(passageKey(c));
  const available = () =>
    uniqueCandidates.filter((c) => !chosenKeys.has(passageKey(c)));
  const lru = (a: Candidate, b: Candidate) =>
    (lastUsedAt.get(passageKey(a)) ?? 0) - (lastUsedAt.get(passageKey(b)) ?? 0);
  // Pick randomly among the passages whose length is closest to `target`, so a
  // later rak'ah stays comparable in recitation length to the first.
  const pickClosest = (pool: Candidate[], target: number) => {
    const sorted = [...pool].sort(
      (a, b) => Math.abs(a.words - target) - Math.abs(b.words - target),
    );
    return pickRandom(sorted.slice(0, Math.min(3, sorted.length)));
  };

  // With focus.repeat, focused passages ignore the anti-repetition window —
  // intentional drilling wants them again and again.
  const focusPick = (list: Candidate[]) => {
    if (!focus) return undefined;
    const pool = (focus.repeat ? list : list.filter(isFresh)).filter(inFocus);
    return pool.length ? pickRandom(pool) : undefined;
  };

  // --- First rak'ah: focused passages take priority, then free choice. ---
  {
    let pick: Candidate | undefined = focusPick(available());
    if (!pick) {
      const fresh = available().filter(isFresh);
      if (fresh.length) pick = pickRandom(fresh);
      else {
        relaxed = true;
        const pool = available().sort(lru);
        pick = pool[0];
      }
    }
    if (!pick) return { passages: [], relaxed, exhausted: true };
    chosen.push(pick);
    chosenKeys.add(passageKey(pick));
  }

  // Target recitation length for the rest of this prayer's rak'ahs.
  const target = chosen[0].words;
  const inBand = (c: Candidate) =>
    c.words >= target * 0.55 && c.words <= target * 1.85;

  // --- Remaining rak'ahs: same/adjacent length band, else closest length. ---
  while (chosen.length < count) {
    const pool = available();
    if (pool.length === 0) break; // no more distinct candidates

    const fresh = pool.filter(isFresh);
    let pick: Candidate;
    const focused = focusPick(pool);
    const freshInBand = fresh.filter(inBand);
    if (focused) {
      // Stay inside the review spotlight whenever it can supply passages.
      pick = focused;
    } else if (freshInBand.length) {
      // Comparable length AND not recently used — the ideal case.
      pick = pickRandom(freshInBand);
    } else if (fresh.length) {
      // No comparable-length fresh option: take the closest length available.
      pick = pickClosest(fresh, target);
    } else {
      // Everything left was recently used — relax anti-repeat, keep length close.
      relaxed = true;
      const relaxedInBand = pool.filter(inBand);
      pick = relaxedInBand.length
        ? pickClosest(relaxedInBand, target)
        : pickClosest(pool, target);
    }
    chosen.push(pick);
    chosenKeys.add(passageKey(pick));
  }

  // Recitation order within a single prayer must follow the Mushaf: a later
  // rak'ah's surah number must be >= an earlier rak'ah's (never backward), and
  // within the same surah, earlier ayahs come first. Sorting the chosen set
  // ascending guarantees this when they're assigned to rak'ahs in order. This
  // only orders passages within THIS suggestion; anti-repetition across prayers
  // is unaffected (it already ran above).
  chosen.sort(
    (a, b) => a.surahNumber - b.surahNumber || a.fromAyah - b.fromAyah,
  );

  return {
    passages: chosen.map(({ surahNumber, fromAyah, toAyah }) => ({
      surahNumber,
      fromAyah,
      toAyah,
    })),
    relaxed,
    exhausted: chosen.length < count,
  };
}
