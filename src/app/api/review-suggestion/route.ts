import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";

const STALE_DAYS = 7; // "a while" = a week without reciting the surah

// Which memorized surah has gone longest without being recited in prayer?
// Never-recited surahs come first, then the most stale one.
export async function GET() {
  const user = await getCurrentUser();
  const memo = await prisma.memorization.findMany({
    where: { userId: user.id },
    select: { surahNumber: true },
    distinct: ["surahNumber"],
  });
  if (memo.length === 0) return Response.json({ suggestion: null });

  const lastUsed = await prisma.recitationHistory.groupBy({
    by: ["surahNumber"],
    where: { userId: user.id },
    _max: { usedAt: true },
  });
  const lastMap = new Map(
    lastUsed.map((r) => [r.surahNumber, r._max.usedAt?.getTime() ?? 0]),
  );

  let pick: { surahNumber: number; last: number } | null = null;
  for (const m of memo) {
    const last = lastMap.get(m.surahNumber) ?? 0;
    if (!pick || last < pick.last) pick = { surahNumber: m.surahNumber, last };
  }
  if (!pick) return Response.json({ suggestion: null });

  // Recently recited everywhere — nothing needs review.
  if (pick.last > Date.now() - STALE_DAYS * 24 * 3600 * 1000) {
    return Response.json({ suggestion: null });
  }

  const surah = await prisma.surah.findUnique({
    where: { number: pick.surahNumber },
  });
  return Response.json({
    suggestion: surah
      ? {
          surahNumber: surah.number,
          nameArabic: surah.nameArabic,
          nameTranslit: surah.nameTranslit,
          neverUsed: pick.last === 0,
        }
      : null,
  });
}
