// Offline mirror of src/lib/selection.ts — identical picking algorithm
// (continuity-first, anti-repeat, length-aware), but reading memorization
// and recitation history from localStorage and Quran text from the bundled
// static data instead of Postgres. Kept in sync by hand: any change to the
// picking logic in selection.ts should be mirrored here.
import type { Mode } from "@/lib/prayers";
import { passageKey, type FocusSpec, type LengthPref, type Passage } from "@/lib/passage";
import { loadMemorization, loadHistoryLocal } from "@/lib/localMemo";
import { ensureOfflineData, wordCountOffline } from "@/lib/offlineData";

interface SelectionSettings {
  noRepeatWindow: number;
  qiyamRepeatWindow: number;
  maxAyahShort: number;
}

interface Candidate extends Passage {
  words: number;
}

function chunkRange(
  surahNumber: number,
  from: number,
  to: number,
  surahAyahCount: number,
  maxLen: number,
): Passage[] {
  const passages: Passage[] = [];
  const isWholeSurah = from === 1 && to === surahAyahCount;
  if (isWholeSurah && surahAyahCount <= maxLen) {
    return [{ surahNumber, fromAyah: 1, toAyah: surahAyahCount }];
  }
  let start = from;
  while (start <= to) {
    const end = Math.min(start + maxLen - 1, to);
    passages.push({ surahNumber, fromAyah: start, toAyah: end });
    start = end + 1;
  }
  return passages;
}

async function buildCandidatesOffline(
  mode: Mode,
  settings: SelectionSettings,
  lengthPref: LengthPref = "medium",
): Promise<Candidate[]> {
  const memorization = loadMemorization();
  const d = await ensureOfflineData();
  const ayahCountBySurah = new Map(d.surahs.map((s) => [s.number, s.ayahCount]));

  const prefLen =
    lengthPref === "short" ? 5 : lengthPref === "long" ? 20 : settings.maxAyahShort;
  const maxLen = mode === "qiyam" ? Math.max(30, prefLen) : prefLen;

  const candidates: Candidate[] = [];
  for (const m of memorization) {
    const count = ayahCountBySurah.get(m.surahNumber);
    if (!count) continue;
    const to = Math.min(m.toAyah, count);
    const from = Math.max(1, m.fromAyah);
    if (from > to) continue;
    for (const ch of chunkRange(m.surahNumber, from, to, count, maxLen)) {
      let words = 0;
      for (let a = ch.fromAyah; a <= ch.toAyah; a++) {
        const ayah = d.quranByKey.get(`${ch.surahNumber}:${a}`);
        if (ayah) words += wordCountOffline(ayah.arabicText);
      }
      candidates.push({ ...ch, words: Math.max(1, words) });
    }
  }
  return candidates;
}

function recentUsageOffline(
  mode: Mode,
  settings: SelectionSettings,
): { recent: Set<string>; lastUsedAt: Map<string, number> } {
  const window =
    mode === "qiyam" ? settings.qiyamRepeatWindow : settings.noRepeatWindow;
  const rows = loadHistoryLocal()
    .slice()
    .sort((a, b) => b.usedAt - a.usedAt)
    .slice(0, Math.max(window * 4, 40));

  const lastUsedAt = new Map<string, number>();
  const orderedDistinct: string[] = [];
  for (const r of rows) {
    const k = passageKey(r);
    if (!lastUsedAt.has(k)) {
      lastUsedAt.set(k, r.usedAt);
      orderedDistinct.push(k);
    }
  }
  const recent = new Set(orderedDistinct.slice(0, window));
  return { recent, lastUsedAt };
}

export interface SelectionResult {
  passages: Passage[];
  relaxed: boolean;
  exhausted: boolean;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function selectPassagesOffline(
  mode: Mode,
  count: number,
  settings: SelectionSettings,
  exclude: Passage[] = [],
  focus: FocusSpec | null = null,
  lengthPref: LengthPref = "medium",
): Promise<SelectionResult> {
  let candidates = await buildCandidatesOffline(mode, settings, lengthPref);
  if (candidates.length === 0) {
    return { passages: [], relaxed: false, exhausted: true };
  }

  const inFocus = (c: Candidate) =>
    !!focus &&
    c.surahNumber === focus.surahNumber &&
    (focus.fromAyah == null || c.fromAyah >= focus.fromAyah) &&
    (focus.toAyah == null || c.toAyah <= focus.toAyah);

  if (focus) {
    const base = candidates.filter((c) => c.surahNumber === focus.surahNumber);
    if (base.length > 0) {
      const lo = focus.fromAyah ?? Math.min(...base.map((c) => c.fromAyah));
      const hi = focus.toAyah ?? Math.max(...base.map((c) => c.toAyah));
      const wordsAt = new Map<string, number>();
      for (const c of base) {
        const per = c.words / (c.toAyah - c.fromAyah + 1);
        for (let a = c.fromAyah; a <= c.toAyah; a++) wordsAt.set(`${a}`, per);
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

  const { recent, lastUsedAt } = recentUsageOffline(mode, settings);
  const excludeKeys = new Set(exclude.map(passageKey));

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
  const pickClosest = (pool: Candidate[], target: number) => {
    const sorted = [...pool].sort(
      (a, b) => Math.abs(a.words - target) - Math.abs(b.words - target),
    );
    return pickRandom(sorted.slice(0, Math.min(3, sorted.length)));
  };

  const focusPick = (list: Candidate[]) => {
    if (!focus) return undefined;
    const pool = (focus.repeat ? list : list.filter(isFresh)).filter(inFocus);
    return pool.length ? pickRandom(pool) : undefined;
  };

  {
    let pick: Candidate | undefined = focusPick(available());
    if (!pick) {
      let fresh = available().filter(isFresh);
      if (fresh.length > 3 && lengthPref !== "medium") {
        const sorted = [...fresh].sort((a, b) => a.words - b.words);
        const third = Math.max(1, Math.floor(sorted.length / 3));
        fresh =
          lengthPref === "short" ? sorted.slice(0, third) : sorted.slice(-third);
      }
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

  const target = chosen[0].words;

  function pickContinuous(prev: Candidate, pool: Candidate[]): Candidate {
    const sameSurah = pool.filter((c) => c.surahNumber === prev.surahNumber);
    if (sameSurah.length) {
      const continuing = sameSurah.filter((c) => c.fromAyah > prev.toAyah);
      if (continuing.length) {
        return [...continuing].sort((a, b) => a.fromAyah - b.fromAyah)[0];
      }
      return pickClosest(sameSurah, target);
    }
    const later = pool.filter((c) => c.surahNumber > prev.surahNumber);
    const nextPool = later.length ? later : pool;
    const nextSurahNum = Math.min(...nextPool.map((c) => c.surahNumber));
    const inNextSurah = nextPool.filter((c) => c.surahNumber === nextSurahNum);
    return [...inNextSurah].sort((a, b) => a.fromAyah - b.fromAyah)[0];
  }

  while (chosen.length < count) {
    const pool = available();
    if (pool.length === 0) break;
    const focused = focusPick(pool);
    const pick = focused ?? pickContinuous(chosen[chosen.length - 1], pool);
    if (!isFresh(pick)) relaxed = true;
    chosen.push(pick);
    chosenKeys.add(passageKey(pick));
  }

  chosen.sort((a, b) => a.surahNumber - b.surahNumber || a.fromAyah - b.fromAyah);

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
