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

// A temporary review spotlight (from the History screen's focus mode): prefer
// passages inside this range, optionally allowing intentional repetition.
export interface FocusSpec {
  surahNumber: number;
  fromAyah: number | null;
  toAyah: number | null;
  repeat: boolean;
  chunk: number;
}
