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
  // "One after another": finishing a count moves on to the next dhikr in
  // TASBIH_PHRASES by itself (after-prayer style), instead of repeating one.
  sequence: boolean;
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
        sequence: !!parsed.sequence,
      };
    }
  } catch {}
  return { phrase: TASBIH_PHRASES[0], target: 33, count: 0, rounds: 0, total: 0, sequence: false };
}

export function saveTasbih(s: TasbihState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new Event("aqim-tasbih-changed"));
  } catch {}
}

// The dhikr after this one in sequence mode (wraps around; a custom phrase
// starts the list from the top).
export function nextPhrase(phrase: string): string {
  const i = TASBIH_PHRASES.indexOf(phrase);
  return TASBIH_PHRASES[(i + 1) % TASBIH_PHRASES.length];
}

// Sequence mode always counts to a number (33 unless 100 was chosen).
export function effectiveTarget(s: TasbihState): number {
  return s.sequence ? s.target || 33 : s.target;
}

// One tap. Completing a cycle (count reaches target) bumps rounds and
// restarts the count — like moving to the next loop of a real misbaha. In
// sequence mode it also moves on to the next dhikr.
export function tapTasbih(s: TasbihState): {
  next: TasbihState;
  cycled: boolean;
  advanced: boolean;
} {
  let { count, rounds, phrase } = s;
  const target = effectiveTarget(s);
  count++;
  let cycled = false;
  if (target > 0 && count >= target) {
    rounds++;
    count = 0;
    cycled = true;
    if (s.sequence) phrase = nextPhrase(s.phrase);
  }
  const next = { ...s, phrase, count, rounds, total: s.total + 1 };
  saveTasbih(next);
  return { next, cycled, advanced: cycled && s.sequence };
}

// Start the after-prayer order from سبحان الله ×33.
export function startSequence(s: TasbihState): TasbihState {
  const next = {
    ...s,
    sequence: true,
    phrase: TASBIH_PHRASES[0],
    target: 33,
    count: 0,
    rounds: 0,
  };
  saveTasbih(next);
  return next;
}

export function resetTasbih(s: TasbihState): TasbihState {
  const next = { ...s, count: 0, rounds: 0 };
  saveTasbih(next);
  return next;
}
