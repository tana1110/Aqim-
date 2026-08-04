// Deterministic daily picks — the same mechanism آية اليوم already uses
// (date-keyed scatter; identical for every user all day), extended with a
// 30-day anti-repetition probe for the du'a and hadith pools.

export function dayKeyOf(date: Date): number {
  return (
    date.getUTCFullYear() * 10000 +
    (date.getUTCMonth() + 1) * 100 +
    date.getUTCDate()
  );
}

export function scatter(dayKey: number, mult: number, total: number): number {
  return Math.abs((dayKey * mult) % total);
}

function scatterProbe(
  date: Date,
  mult: number,
  total: number,
  taken: Set<number>,
): number {
  let idx = scatter(dayKeyOf(date), mult, total);
  let guard = 0;
  while (taken.has(idx) && guard < total) {
    idx = (idx + 1) % total;
    guard++;
  }
  return idx;
}

// Today's pick, skipping whatever the previous `window` days picked —
// fully deterministic, so every user computes the same value.
export function pickNoRepeat(
  date: Date,
  mult: number,
  total: number,
  window = 30,
): number {
  if (total <= 1) return 0;
  const prev = new Set<number>();
  if (total > window) {
    for (let i = window; i >= 1; i--) {
      const p = new Date(date);
      p.setUTCDate(p.getUTCDate() - i);
      prev.add(scatterProbe(p, mult, total, prev));
    }
  }
  return scatterProbe(date, mult, total, prev);
}

export const AYAH_MULT = 2654435761; // آية اليوم's existing constant
export const DUA_MULT = 40503;
export const HADITH_MULT = 265443;
