// Prayer / rak'ah structure and the fixed-surah rules.
// Defaults follow common practice; several values are user-configurable in Settings.
// NOTE: "Fiqh-related choices (like the number of Witr rak'ahs) reflect common
// practice — please consult a scholar to confirm what's correct for you."

// Surah numbers for the fixed surahs that must NEVER be substituted/randomized.
export const AL_KAFIRUN = 109;
export const AL_IKHLAS = 112;

export type Mode = "faraid" | "nafl" | "qiyam";

export type PrayerKey =
  | "fajr"
  | "dhuhr"
  | "asr"
  | "maghrib"
  | "isha"
  | "witr"
  | "qiyam";

// A single rak'ah slot in a prayer's recitation plan.
export interface RakahSlot {
  rakah: number;
  // "fatiha-only": only Al-Fatiha, no additional surah (no suggestion needed)
  // "suggest": Al-Fatiha + a suggested passage from the user's memorization
  // "fixed": Al-Fatiha + a specific mandated surah (never randomized)
  kind: "fatiha-only" | "suggest" | "fixed";
  fixedSurah?: number; // set when kind === "fixed"
  label?: string; // human note, e.g. "Fixed: Al-Ikhlas"
}

export interface PrayerPlan {
  key: PrayerKey;
  nameEnglish: string;
  nameArabic: string;
  slots: RakahSlot[];
  note?: string;
}

// ---------------------------------------------------------------------------
// Obligatory prayers (Fara'id). Rak'ah counts per common practice.
// ---------------------------------------------------------------------------

function suggestSlots(n: number): RakahSlot[] {
  return Array.from({ length: n }, (_, i) => ({
    rakah: i + 1,
    kind: "suggest" as const,
  }));
}

// First `withSurah` rak'ahs get a suggested surah, the rest are Fatiha-only.
function faraidSlots(total: number, withSurah: number): RakahSlot[] {
  return Array.from({ length: total }, (_, i) => ({
    rakah: i + 1,
    kind: i < withSurah ? ("suggest" as const) : ("fatiha-only" as const),
  }));
}

export type FaraidPrayer = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export function getFaraidPlan(prayer: FaraidPrayer): PrayerPlan {
  switch (prayer) {
    case "fajr":
      return {
        key: "fajr",
        nameEnglish: "Fajr",
        nameArabic: "الفجر",
        slots: faraidSlots(2, 2),
      };
    case "dhuhr":
      return {
        key: "dhuhr",
        nameEnglish: "Dhuhr",
        nameArabic: "الظهر",
        slots: faraidSlots(4, 2),
      };
    case "asr":
      return {
        key: "asr",
        nameEnglish: "Asr",
        nameArabic: "العصر",
        slots: faraidSlots(4, 2),
      };
    case "maghrib":
      return {
        key: "maghrib",
        nameEnglish: "Maghrib",
        nameArabic: "المغرب",
        slots: faraidSlots(3, 2),
      };
    case "isha":
      return {
        key: "isha",
        nameEnglish: "Isha",
        nameArabic: "العشاء",
        slots: faraidSlots(4, 2),
      };
  }
}

// ---------------------------------------------------------------------------
// Voluntary prayers (Nawafil) — the fixed Sunnahs.
// ---------------------------------------------------------------------------

// Fajr Sunnah (2 rak'ahs before Fajr): Al-Kafirun then Al-Ikhlas — fixed.
export const FAJR_SUNNAH: PrayerPlan = {
  key: "fajr",
  nameEnglish: "Fajr Sunnah (before)",
  nameArabic: "سنة الفجر",
  slots: [
    { rakah: 1, kind: "fixed", fixedSurah: AL_KAFIRUN, label: "Fixed: Al-Kafirun" },
    { rakah: 2, kind: "fixed", fixedSurah: AL_IKHLAS, label: "Fixed: Al-Ikhlas" },
  ],
  note: "Fixed by text — no randomization applies.",
};

// Maghrib Sunnah (2 rak'ahs after Maghrib): Al-Kafirun then Al-Ikhlas — fixed.
export const MAGHRIB_SUNNAH: PrayerPlan = {
  key: "maghrib",
  nameEnglish: "Maghrib Sunnah (after)",
  nameArabic: "سنة المغرب",
  slots: [
    { rakah: 1, kind: "fixed", fixedSurah: AL_KAFIRUN, label: "Fixed: Al-Kafirun" },
    { rakah: 2, kind: "fixed", fixedSurah: AL_IKHLAS, label: "Fixed: Al-Ikhlas" },
  ],
  note: "Fixed by text — no randomization applies.",
};

// Dhuhr Sunnah (rawatib): 4 rak'ahs before + 2 after — each Fatiha + a
// free-choice surah (subject to anti-repetition).
export const DHUHR_NAFL: PrayerPlan = {
  key: "dhuhr",
  nameEnglish: "Dhuhr Sunnah (4 before + 2 after)",
  nameArabic: "سنن الظهر",
  slots: suggestSlots(6),
  note: "4 rak'ahs before Dhuhr + 2 after. Free selection with anti-repetition.",
};

// Shaf' (2 rak'ahs after Isha, before Witr): Fatiha + a free-choice surah each.
export const SHAF_NAFL: PrayerPlan = {
  key: "isha",
  nameEnglish: "Shaf' (before Witr)",
  nameArabic: "الشفع",
  slots: suggestSlots(2),
  note: "Two rak'ahs after the Isha nafl, immediately before Witr.",
};

// Witr: prayed once daily after Isha (a Sunnah). Configurable rak'ahs; the final
// rak'ah is fixed Al-Ikhlas and is never randomized.
export function getWitrPlan(witrRakahs: number): PrayerPlan {
  const n = Math.max(1, witrRakahs);
  const slots: RakahSlot[] = Array.from({ length: n }, (_, i) => {
    const isLast = i === n - 1;
    return isLast
      ? {
          rakah: i + 1,
          kind: "fixed" as const,
          fixedSurah: AL_IKHLAS,
          label: "Fixed: Al-Ikhlas",
        }
      : { rakah: i + 1, kind: "suggest" as const };
  });
  return {
    key: "witr",
    nameEnglish: "Witr",
    nameArabic: "الوتر",
    slots,
    note: "Prayed once daily, after Isha. Rak'ah count is configurable in Settings; the last rak'ah is Al-Ikhlas.",
  };
}

// Free-choice voluntary rak'ahs (generic nafl).
export function naflPlan(rakahs: number): PrayerPlan {
  return {
    key: "isha",
    nameEnglish: "Voluntary (Nafl)",
    nameArabic: "نافلة",
    slots: suggestSlots(rakahs),
    note: "Free selection from your memorization, with anti-repetition applied.",
  };
}

// Obligatory prayers only (Witr is a Sunnah, listed under Nawafil).
export const PRAYER_LIST: {
  key: FaraidPrayer;
  nameEnglish: string;
  nameArabic: string;
}[] = [
  { key: "fajr", nameEnglish: "Fajr", nameArabic: "الفجر" },
  { key: "dhuhr", nameEnglish: "Dhuhr", nameArabic: "الظهر" },
  { key: "asr", nameEnglish: "Asr", nameArabic: "العصر" },
  { key: "maghrib", nameEnglish: "Maghrib", nameArabic: "المغرب" },
  { key: "isha", nameEnglish: "Isha", nameArabic: "العشاء" },
];
