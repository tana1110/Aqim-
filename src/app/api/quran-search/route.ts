import { prisma } from "@/lib/prisma";
import { normalizeArabic } from "@/lib/arabic";

// Word/phrase search over the locally-stored, verified Quran text — a pure
// normalized text match; nothing generated, nothing interpreted.

interface Row {
  surahNumber: number;
  ayahNumber: number;
  arabicText: string;
  pageNumber: number;
}

// The whole text is small (~2MB); keep a normalized copy warm per instance.
let cache: { rows: Row[]; norm: string[] } | null = null;

async function load() {
  if (cache) return cache;
  const rows = await prisma.quranText.findMany({
    select: {
      surahNumber: true,
      ayahNumber: true,
      arabicText: true,
      pageNumber: true,
    },
    orderBy: [{ surahNumber: "asc" }, { ayahNumber: "asc" }],
  });
  cache = { rows, norm: rows.map((r) => normalizeArabic(r.arabicText)) };
  return cache;
}

export async function GET(request: Request) {
  const q = normalizeArabic(new URL(request.url).searchParams.get("q") ?? "");
  if (q.length < 2) return Response.json({ results: [] });
  const { rows, norm } = await load();
  const surahs = await prisma.surah.findMany({
    select: { number: true, nameArabic: true, nameTranslit: true },
  });
  const names = new Map(surahs.map((s) => [s.number, s]));
  const results: {
    surah: number;
    nameArabic: string;
    nameTranslit: string;
    ayah: number;
    page: number;
    text: string;
  }[] = [];
  for (let i = 0; i < rows.length && results.length < 50; i++) {
    if (norm[i].includes(q)) {
      const r = rows[i];
      const n = names.get(r.surahNumber);
      results.push({
        surah: r.surahNumber,
        nameArabic: n?.nameArabic ?? "",
        nameTranslit: n?.nameTranslit ?? "",
        ayah: r.ayahNumber,
        page: r.pageNumber,
        text: r.arabicText,
      });
    }
  }
  return Response.json({ results });
}
