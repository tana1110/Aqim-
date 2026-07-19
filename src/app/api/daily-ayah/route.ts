import { prisma } from "@/lib/prisma";

// Ayah of the day — deterministic pick from the verified local text (never
// generated). Same ayah for everyone all day; changes daily.
export async function GET() {
  const now = new Date();
  const dayKey =
    now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
  // Simple deterministic scatter across the 6236 ayahs.
  const total = await prisma.quranText.count();
  if (total === 0) return Response.json({ ayah: null });
  const index = (dayKey * 2654435761) % total;

  const row = await prisma.quranText.findFirst({
    orderBy: [{ surahNumber: "asc" }, { ayahNumber: "asc" }],
    skip: index,
  });
  if (!row) return Response.json({ ayah: null });

  const [surah, translation] = await Promise.all([
    prisma.surah.findUnique({ where: { number: row.surahNumber } }),
    prisma.translationText.findFirst({
      where: { surahNumber: row.surahNumber, ayahNumber: row.ayahNumber },
    }),
  ]);

  return Response.json({
    ayah: {
      surahNumber: row.surahNumber,
      ayahNumber: row.ayahNumber,
      arabicText: row.arabicText,
      surahNameArabic: surah?.nameArabic ?? "",
      surahNameTranslit: surah?.nameTranslit ?? "",
      translation: translation?.text ?? null,
    },
  });
}
