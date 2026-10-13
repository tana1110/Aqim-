// Pure passage helpers with zero imports — kept separate from selection.ts
// (which imports Prisma) so client-side code (offlineSelection.ts) can use
// passageKey/Passage without accidentally pulling the database client into
// the browser bundle.

// A recitation unit: a contiguous range of ayahs within one surah.
export interface Passage {
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
}

export function passageKey(p: Passage): string {
  return `${p.surahNumber}:${p.fromAyah}-${p.toAyah}`;
}

export type LengthPref = "short" | "medium" | "long";

// Passage length is a READING amount, not an ayah count: a word budget plus
// an ayah cap. Short-ayah surahs (Juz' 'Amma) yield more ayat, long-ayah
// surahs (Al-Baqarah) fewer — so "short" takes about the same time anywhere.
const LENGTHS: Record<LengthPref, { words: number; ayat: number }> = {
  short: { words: 45, ayat: 10 },
  medium: { words: 75, ayat: 15 },
  long: { words: 115, ayat: 25 },
};
const QIYAM = { words: 160, ayat: 40 };

// Split a memorized [from,to] span into consecutive recitation units without
// ever cutting an ayah. A whole surah within the budget stays one unit, and a
// tiny leftover at the end is folded into the unit before it.
export function chunkByWords(
  surahNumber: number,
  from: number,
  to: number,
  wordsOf: (ayah: number) => number,
  lengthPref: LengthPref,
  qiyam: boolean,
): { passage: Passage; words: number }[] {
  const base = LENGTHS[lengthPref];
  const limit = qiyam
    ? { words: Math.max(base.words, QIYAM.words), ayat: Math.max(base.ayat, QIYAM.ayat) }
    : base;
  const units: { from: number; to: number; words: number }[] = [];
  let cur: { from: number; to: number; words: number } | null = null;
  for (let a = from; a <= to; a++) {
    const w = Math.max(1, wordsOf(a));
    if (cur && (cur.words + w > limit.words || cur.to - cur.from + 1 >= limit.ayat)) {
      units.push(cur);
      cur = null;
    }
    if (!cur) cur = { from: a, to: a, words: w };
    else {
      cur.to = a;
      cur.words += w;
    }
  }
  if (cur) {
    const prev = units[units.length - 1];
    const ayat = cur.to - cur.from + 1 + (prev ? prev.to - prev.from + 1 : 0);
    if (
      prev &&
      cur.words < limit.words * 0.35 &&
      prev.words + cur.words <= limit.words * 1.35 &&
      ayat <= Math.ceil(limit.ayat * 1.35)
    ) {
      prev.to = cur.to;
      prev.words += cur.words;
    } else units.push(cur);
  }
  return units.map((u) => ({
    passage: { surahNumber, fromAyah: u.from, toAyah: u.to },
    words: u.words,
  }));
}

// The seeded text merges the Basmala into ayah 1 (4 words) for every surah
// except Al-Fatiha and At-Tawbah — not part of the recitation length.
export function basmalaWords(surahNumber: number, ayah: number): number {
  return ayah === 1 && surahNumber !== 1 && surahNumber !== 9 ? 4 : 0;
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
