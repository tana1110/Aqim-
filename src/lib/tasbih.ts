// Digital misbaha — the classic tasbih counter. The phrase list contains only
// the universally-known dhikr formulas (as found in Hisn al-Muslim); nothing
// is ever generated.

export const TASBIH_PHRASES = [
  "سُبْحَانَ اللَّهِ",
  "الْحَمْدُ لِلَّهِ",
  "اللَّهُ أَكْبَرُ",
  "لَا إِلَهَ إِلَّا اللَّهُ",
  "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
  "سُبْحَانَ اللَّهِ الْعَظِيمِ",
  "أَسْتَغْفِرُ اللَّهَ",
  "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
];

export interface TasbihState {
  phrase: string;
  target: number; // 0 = free counting (no cycle)
  count: number;
  rounds: number;
  total: number; // lifetime taps
}

const KEY = "aqim-tasbih";

export function loadTasbih(): TasbihState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TasbihState>;
      return {
        phrase: parsed.phrase || TASBIH_PHRASES[0],
        target: Number.isFinite(parsed.target) ? Number(parsed.target) : 33,
        count: Number(parsed.count) || 0,
        rounds: Number(parsed.rounds) || 0,
        total: Number(parsed.total) || 0,
      };
    }
  } catch {}
  return { phrase: TASBIH_PHRASES[0], target: 33, count: 0, rounds: 0, total: 0 };
}

export function saveTasbih(s: TasbihState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new Event("aqim-tasbih-changed"));
  } catch {}
}

// One tap. Completing a cycle (count reaches target) bumps rounds and
// restarts the count — like moving to the next loop of a real misbaha.
export function tapTasbih(s: TasbihState): { next: TasbihState; cycled: boolean } {
  let { count, rounds } = s;
  count++;
  let cycled = false;
  if (s.target > 0 && count >= s.target) {
    rounds++;
    count = 0;
    cycled = true;
  }
  const next = { ...s, count, rounds, total: s.total + 1 };
  saveTasbih(next);
  return { next, cycled };
}

export function resetTasbih(s: TasbihState): TasbihState {
  const next = { ...s, count: 0, rounds: 0 };
  saveTasbih(next);
  return next;
}
