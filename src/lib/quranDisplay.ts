import type { Lang } from "@/lib/i18n";

// Strip a stray leading BOM / zero-width no-break space and trim.
export function cleanAyah(text: string): string {
  return text.replace(/^﻿/, "").trim();
}

// The seeded Arabic surah name includes a "سُورَةُ " prefix (e.g.
// "سُورَةُ البَقَرَةِ"). Strip it so the UI can add a single "سورة" / "Surah"
// label consistently. Written with \u escapes (no literal Arabic in the regex).
//   س=س  و=و  ر=ر  ة=ة
export function bareSurahNameAr(name: string): string {
  const stripped = name
    .replace(
      /^﻿?\s*س\p{M}*و\p{M}*ر\p{M}*ة\p{M}*\s+/u,
      "",
    )
    .trim();
  return stripped || name.trim();
}

// The bare surah name to show for the current language.
export function surahName(
  lang: Lang,
  nameArabic: string,
  nameTranslit: string,
): string {
  return lang === "ar" ? bareSurahNameAr(nameArabic) : nameTranslit;
}

// ---------------------------------------------------------------------------
// Bismillah display
// ---------------------------------------------------------------------------
// Per standard Mushaf layout, the Bismillah is shown as its own line above the
// first ayah when a passage starts at ayah 1 — with two exceptions:
//   - Surah 9 (At-Tawbah): never shown.
//   - Surah 1 (Al-Fatiha): the Bismillah IS ayah 1, so it's shown once (as its
//     own numbered line), never duplicated as a separate header.
// For all other surahs the source text merges the Bismillah into ayah 1's text
// (its first four words), so we split it out.

export interface BismillahDisplay {
  line: string | null; // Bismillah text to render on its own line (null = none)
  lineIsAyahOne: boolean; // true for Al-Fatiha (the line carries ayah number ١)
  skipFirstAyah: boolean; // true when the line replaces the first ayah entirely
  firstAyahText: string | null; // replacement text for ayah 1 (Bismillah stripped)
}

export function getBismillahDisplay(
  surahNumber: number,
  startingAyah: number,
  firstAyahText: string,
): BismillahDisplay {
  const none: BismillahDisplay = {
    line: null,
    lineIsAyahOne: false,
    skipFirstAyah: false,
    firstAyahText: null,
  };

  if (startingAyah !== 1 || surahNumber === 9) return none;

  const clean = cleanAyah(firstAyahText);

  if (surahNumber === 1) {
    // Al-Fatiha: ayah 1 is the Bismillah — show it once, as its own line.
    return {
      line: clean,
      lineIsAyahOne: true,
      skipFirstAyah: true,
      firstAyahText: null,
    };
  }

  // Other surahs: the Bismillah is the first four words of ayah 1.
  const tokens = clean.split(/\s+/).filter(Boolean);
  const line = tokens.slice(0, 4).join(" ");
  const rest = tokens.slice(4).join(" ");
  return {
    line,
    lineIsAyahOne: false,
    skipFirstAyah: false,
    firstAyahText: rest,
  };
}
