import { prisma } from "@/lib/prisma";

export interface JuzSegment {
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
}

// Compute the surah/ayah composition of each of the 30 juz' from the seeded
// text, so the setup screen can offer "select by juz".
export async function GET() {
  const rows = await prisma.quranText.findMany({
    select: { surahNumber: true, ayahNumber: true, juzNumber: true },
    orderBy: [{ surahNumber: "asc" }, { ayahNumber: "asc" }],
  });

  // juz -> surah -> {min,max} ayah
  const map = new Map<number, Map<number, { from: number; to: number }>>();
  for (const r of rows) {
    if (!map.has(r.juzNumber)) map.set(r.juzNumber, new Map());
    const bySurah = map.get(r.juzNumber)!;
    const cur = bySurah.get(r.surahNumber);
    if (!cur) {
      bySurah.set(r.surahNumber, { from: r.ayahNumber, to: r.ayahNumber });
    } else {
      cur.from = Math.min(cur.from, r.ayahNumber);
      cur.to = Math.max(cur.to, r.ayahNumber);
    }
  }

  const juz: { juz: number; segments: JuzSegment[] }[] = [];
  for (let j = 1; j <= 30; j++) {
    const bySurah = map.get(j);
    const segments: JuzSegment[] = bySurah
      ? [...bySurah.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([surahNumber, r]) => ({
            surahNumber,
            fromAyah: r.from,
            toAyah: r.to,
          }))
      : [];
    juz.push({ juz: j, segments });
  }

  return Response.json({ juz });
}
