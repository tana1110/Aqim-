import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultUser } from "@/lib/user";
import { passageKey } from "@/lib/selection";

// Variety stats for the past week (and all-time), to encourage variety.
export async function GET() {
  const user = await getOrCreateDefaultUser();

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [weekRows, allRows] = await Promise.all([
    prisma.recitationHistory.findMany({
      where: { userId: user.id, usedAt: { gte: weekAgo } },
    }),
    prisma.recitationHistory.findMany({ where: { userId: user.id } }),
  ]);

  const weekPassages = new Set(weekRows.map(passageKey));
  const weekSurahs = new Set(weekRows.map((r) => r.surahNumber));
  const allPassages = new Set(allRows.map(passageKey));

  // Per-surah tally this week.
  const perSurah = new Map<number, number>();
  for (const r of weekRows) {
    perSurah.set(r.surahNumber, (perSurah.get(r.surahNumber) ?? 0) + 1);
  }
  const surahNumbers = [...perSurah.keys()];
  const surahs = surahNumbers.length
    ? await prisma.surah.findMany({ where: { number: { in: surahNumbers } } })
    : [];
  const nameByNumber = new Map(surahs.map((s) => [s.number, s]));

  const bySurah = [...perSurah.entries()]
    .map(([number, count]) => ({
      surahNumber: number,
      count,
      nameEnglish: nameByNumber.get(number)?.nameTranslit ?? `Surah ${number}`,
      nameArabic: nameByNumber.get(number)?.nameArabic ?? "",
    }))
    .sort((a, b) => b.count - a.count);

  return Response.json({
    week: {
      totalRecitations: weekRows.length,
      distinctPassages: weekPassages.size,
      distinctSurahs: weekSurahs.size,
      bySurah,
    },
    allTime: {
      totalRecitations: allRows.length,
      distinctPassages: allPassages.size,
    },
  });
}
