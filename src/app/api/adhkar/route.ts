import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Hisn al-Muslim content (verified, locally stored — never generated).
// GET            → chapter list in book order
// GET ?chapter=N → the adhkar of chapter N
export async function GET(request: NextRequest) {
  const chapterParam = request.nextUrl.searchParams.get("chapter");

  if (chapterParam) {
    const chapterIndex = Number(chapterParam);
    const items = await prisma.adhkarText.findMany({
      where: { chapterIndex },
      orderBy: { position: "asc" },
    });
    return Response.json({
      chapter: items[0]?.chapter ?? null,
      source: items[0]?.source ?? null,
      items: items.map((i) => ({
        id: i.id,
        text: i.text,
        count: i.count,
        reference: i.reference,
      })),
    });
  }

  const rows = await prisma.adhkarText.groupBy({
    by: ["chapterIndex", "chapter"],
    _count: { _all: true },
    orderBy: { chapterIndex: "asc" },
  });
  return Response.json({
    chapters: rows.map((r) => ({
      index: r.chapterIndex,
      title: r.chapter,
      count: r._count._all,
    })),
  });
}
