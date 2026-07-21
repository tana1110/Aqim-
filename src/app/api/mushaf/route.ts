import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Digital Mushaf pages, straight from the verified local text (the seeded
// Tanzil Uthmani includes each ayah's standard Mushaf page number, 1..604).
// GET ?page=N   → the ayahs of page N (+ surah metadata + surah page spans)
// GET ?surah=N  → { page } where surah N begins
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const surahParam = sp.get("surah");
  if (surahParam) {
    const first = await prisma.quranText.findFirst({
      where: { surahNumber: Number(surahParam) },
      orderBy: { ayahNumber: "asc" },
      select: { pageNumber: true },
    });
    return Response.json({ page: first?.pageNumber ?? 1 });
  }

  const page = Math.min(604, Math.max(1, Number(sp.get("page")) || 1));
  const ayahs = await prisma.quranText.findMany({
    where: { pageNumber: page },
    orderBy: [{ surahNumber: "asc" }, { ayahNumber: "asc" }],
  });

  const surahNums = [...new Set(ayahs.map((a) => a.surahNumber))];
  const [surahs, spans] = await Promise.all([
    prisma.surah.findMany({ where: { number: { in: surahNums } } }),
    // Each involved surah's page span, for the reading-progress bar.
    Promise.all(
      surahNums.map(async (n) => {
        const agg = await prisma.quranText.aggregate({
          where: { surahNumber: n },
          _min: { pageNumber: true },
          _max: { pageNumber: true },
        });
        return {
          surahNumber: n,
          firstPage: agg._min.pageNumber ?? page,
          lastPage: agg._max.pageNumber ?? page,
        };
      }),
    ),
  ]);
  const metaByNum = new Map(surahs.map((s) => [s.number, s]));

  return Response.json({
    page,
    totalPages: 604,
    ayahs: ayahs.map((a) => ({
      surahNumber: a.surahNumber,
      ayahNumber: a.ayahNumber,
      text: a.arabicText,
    })),
    surahs: surahNums.map((n) => ({
      number: n,
      nameArabic: metaByNum.get(n)?.nameArabic ?? "",
      nameTranslit: metaByNum.get(n)?.nameTranslit ?? "",
      ...spans.find((s) => s.surahNumber === n)!,
    })),
  });
}
