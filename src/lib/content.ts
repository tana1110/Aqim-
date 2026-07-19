import { prisma } from "@/lib/prisma";
import type { Passage } from "@/lib/selection";

export interface AyahContent {
  ayahNumber: number;
  arabicText: string;
  tafsirSummary: string | null;
  translation: string | null; // English translation of the meaning
}

export interface PassageContent {
  surahNumber: number;
  surahNameArabic: string;
  surahNameEnglish: string;
  surahNameTranslit: string;
  fromAyah: number;
  toAyah: number;
  ayahs: AyahContent[];
  tafsirSource: string | null;
  tafsirSourceUrl: string | null;
  translationSource: string | null;
}

// Fetch the verified Arabic text (Uthmani), tafsir summaries, and English
// translation for a passage. Text is read ONLY from the locally-seeded,
// source-verified tables.
export async function getPassageContent(
  passage: Passage,
  tafsirSource: string,
): Promise<PassageContent | null> {
  const surah = await prisma.surah.findUnique({
    where: { number: passage.surahNumber },
  });
  if (!surah) return null;

  const range = {
    surahNumber: passage.surahNumber,
    ayahNumber: { gte: passage.fromAyah, lte: passage.toAyah },
  };

  const [ayahs, tafsirRows, translationRows] = await Promise.all([
    prisma.quranText.findMany({ where: range, orderBy: { ayahNumber: "asc" } }),
    prisma.tafsirText.findMany({
      where: range,
      orderBy: { ayahNumber: "asc" },
    }),
    prisma.translationText.findMany({
      where: range,
      orderBy: { ayahNumber: "asc" },
    }),
  ]);

  // Prefer the requested tafsir edition if present; otherwise use whatever is
  // stored. `tafsirSource` may be an edition id or the stored label.
  const preferred = tafsirRows.filter(
    (t) =>
      t.tafsirSource === tafsirSource ||
      t.tafsirSource.toLowerCase().includes(tafsirSource.toLowerCase()),
  );
  const chosen = preferred.length > 0 ? preferred : tafsirRows;

  const tafsirByAyah = new Map(chosen.map((t) => [t.ayahNumber, t]));
  const translationByAyah = new Map(
    translationRows.map((t) => [t.ayahNumber, t]),
  );

  return {
    surahNumber: surah.number,
    surahNameArabic: surah.nameArabic,
    surahNameEnglish: surah.nameEnglish,
    surahNameTranslit: surah.nameTranslit,
    fromAyah: passage.fromAyah,
    toAyah: passage.toAyah,
    ayahs: ayahs.map((a) => ({
      ayahNumber: a.ayahNumber,
      arabicText: a.arabicText,
      tafsirSummary: tafsirByAyah.get(a.ayahNumber)?.summaryText ?? null,
      translation: translationByAyah.get(a.ayahNumber)?.text ?? null,
    })),
    tafsirSource: chosen[0]?.tafsirSource ?? null,
    tafsirSourceUrl: chosen[0]?.sourceUrl ?? null,
    translationSource: translationRows[0]?.source ?? null,
  };
}
