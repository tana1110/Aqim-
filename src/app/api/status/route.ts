import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultUser } from "@/lib/user";

// Lightweight readiness probe for the UI: is reference data seeded, and has the
// user selected any memorization yet?
export async function GET() {
  try {
    const user = await getOrCreateDefaultUser();
    const [surahCount, ayahCount, memoCount] = await Promise.all([
      prisma.surah.count(),
      prisma.quranText.count(),
      prisma.memorization.count({ where: { userId: user.id } }),
    ]);
    return Response.json({
      ok: true,
      seeded: surahCount === 114 && ayahCount > 6000,
      surahCount,
      ayahCount,
      hasMemorization: memoCount > 0,
    });
  } catch (e) {
    return Response.json(
      { ok: false, seeded: false, error: (e as Error).message },
      { status: 200 },
    );
  }
}
