import { prisma } from "@/lib/prisma";
import type { Passage } from "@/lib/selection";

export interface AyahContent {
  ayahNumber: number;
  arabicText: string;
  tafsirSummary: string | null;
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
}

// Fetch the verified Arabic text (Uthmani) and tafsir summaries for a passage.
// Text is read ONLY from the locally-seeded, source-verified tables.
export async function getPassageContent(
  passage: Passage,
  tafsirSource: string,
): Promise<PassageContent | null> {
  const surah = await prisma.surah.findUnique({
    where: { number: passage.surahNumber },
  });
  if (!surah) return null;

  const [ayahs, tafsirRows] = await Promise.all([
    prisma.quranText.findMany({
      where: {
        surahNumber: passage.surahNumber,
        ayahNumber: { gte: passage.fromAyah, lte: passage.toAyah },
      },
      orderBy: { ayahNumber: "asc" },
    }),
    prisma.tafsirText.findMany({
      where: {
        surahNumber: passage.surahNumber,
        ayahNumber: { gte: passage.fromAyah, lte: passage.toAyah },
      },
      orderBy: { ayahNumber: "asc" },
    }),
  ]);

  // Prefer the requested tafsir edition if present; otherwise use whatever is
  // stored (currently a single source). `tafsirSource` may be an edition id
  // (e.g. "ar.muyassar") or the stored human label, so match loosely.
  const preferred = tafsirRows.filter(
    (t) =>
      t.tafsirSource === tafsirSource ||
      t.tafsirSource.toLowerCase().includes(tafsirSource.toLowerCase()),
  );
  const chosen = preferred.length > 0 ? preferred : tafsirRows;

  const tafsirByAyah = new Map(chosen.map((t) => [t.ayahNumber, t]));
  const first = chosen[0];

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
    })),
    tafsirSource: first?.tafsirSource ?? null,
    tafsirSourceUrl: first?.sourceUrl ?? null,
  };
}
