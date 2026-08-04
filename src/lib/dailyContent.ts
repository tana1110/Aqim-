import { prisma } from "@/lib/prisma";
import {
  AYAH_MULT,
  DUA_MULT,
  HADITH_MULT,
  dayKeyOf,
  pickNoRepeat,
  scatter,
} from "@/lib/dailyPick";

// The three daily picks, all from verified local datasets, all
// deterministic per UTC date (identical for every user).

export async function getDailyAyah(date: Date) {
  const total = await prisma.quranText.count();
  if (total === 0) return null;
  // آية اليوم keeps its ORIGINAL formula (no probe) for continuity.
  const index = scatter(dayKeyOf(date), AYAH_MULT, total);
  const row = await prisma.quranText.findFirst({
    orderBy: [{ surahNumber: "asc" }, { ayahNumber: "asc" }],
    skip: index,
  });
  if (!row) return null;
  const surah = await prisma.surah.findUnique({
    where: { number: row.surahNumber },
  });
  return {
    surahNumber: row.surahNumber,
    ayahNumber: row.ayahNumber,
    arabicText: row.arabicText,
    surahNameArabic: surah?.nameArabic ?? "",
    surahNameTranslit: surah?.nameTranslit ?? "",
  };
}

export async function getDailyExtras(date: Date) {
  const [adhkar, hadithCount] = await Promise.all([
    prisma.adhkarText.findMany({
      select: {
        id: true,
        text: true,
        reference: true,
        source: true,
        chapter: true,
      },
      orderBy: { id: "asc" },
    }),
    prisma.hadithText.count(),
  ]);
  // mechanical size filter for the card (no editorial judgment)
  const duaPool = adhkar.filter((a) => a.text.length <= 550);
  const dua =
    duaPool.length > 0
      ? duaPool[pickNoRepeat(date, DUA_MULT, duaPool.length)]
      : null;

  let hadith = null;
  if (hadithCount > 0) {
    const idx = pickNoRepeat(date, HADITH_MULT, hadithCount);
    hadith = await prisma.hadithText.findFirst({
      orderBy: [{ collection: "asc" }, { number: "asc" }],
      skip: idx,
    });
  }
  return {
    dua: dua
      ? {
          text: dua.text,
          reference: dua.reference,
          source: dua.source,
          chapter: dua.chapter,
        }
      : null,
    hadith: hadith
      ? {
          text: hadith.text,
          collection: hadith.collection,
          number: hadith.number,
          book: hadith.book,
          source: hadith.source,
        }
      : null,
  };
}
