// "Focus mode" — a temporary review spotlight on one surah/range, layered ON
// TOP of the user's permanent memorization (never edits it). Stored on-device
// and sent along with suggestion requests.

export interface FocusConfig {
  active: boolean;
  surahNumber: number | null;
  fromAyah: number | null; // null = the whole memorized part of the surah
  toAyah: number | null;
  repeat: boolean; // intentionally allow repeats (skip anti-repetition inside the focus)
  chunk: number; // preferred ayat per passage while focusing
}

const KEY = "aqim-focus";

export function defaultFocus(): FocusConfig {
  return {
    active: false,
    surahNumber: null,
    fromAyah: null,
    toAyah: null,
    repeat: false,
    chunk: 5,
  };
}

export function loadFocus(): FocusConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaultFocus(), ...JSON.parse(raw) };
  } catch {}
  return defaultFocus();
}

export function saveFocus(cfg: FocusConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {}
}

// The payload attached to /api/suggest requests (null when inactive).
export function focusPayload(): FocusRequest | null {
  const f = loadFocus();
  if (!f.active || !f.surahNumber) return null;
  return {
    surahNumber: f.surahNumber,
    fromAyah: f.fromAyah,
    toAyah: f.toAyah,
    repeat: f.repeat,
    chunk: f.chunk,
  };
}

export interface FocusRequest {
  surahNumber: number;
  fromAyah: number | null;
  toAyah: number | null;
  repeat: boolean;
  chunk: number;
}
