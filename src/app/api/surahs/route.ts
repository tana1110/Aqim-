import { prisma } from "@/lib/prisma";

// List all surah metadata (for the setup picker + wird progress).
// Includes each surah's Mushaf page span, derived from the Quran text.
export async function GET() {
  const [surahs, pages] = await Promise.all([
    prisma.surah.findMany({ orderBy: { number: "asc" } }),
    prisma.quranText.groupBy({
      by: ["surahNumber"],
      _min: { pageNumber: true },
      _max: { pageNumber: true },
    }),
  ]);
  const span = new Map(
    pages.map((p) => [
      p.surahNumber,
      { firstPage: p._min.pageNumber, lastPage: p._max.pageNumber },
    ]),
  );
  return Response.json({
    surahs: surahs.map((s) => ({
      ...s,
      firstPage: span.get(s.number)?.firstPage ?? null,
      lastPage: span.get(s.number)?.lastPage ?? null,
    })),
  });
}
