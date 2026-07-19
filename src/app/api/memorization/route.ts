import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultUser } from "@/lib/user";

// Get the current user's memorized ranges.
export async function GET() {
  const user = await getOrCreateDefaultUser();
  const memorization = await prisma.memorization.findMany({
    where: { userId: user.id },
    orderBy: [{ surahNumber: "asc" }, { fromAyah: "asc" }],
  });
  return Response.json({ memorization });
}

interface Range {
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
}

// Replace the user's memorization with the provided set of ranges.
export async function PUT(request: Request) {
  const user = await getOrCreateDefaultUser();
  const body = (await request.json()) as { ranges?: Range[] };
  const ranges = Array.isArray(body.ranges) ? body.ranges : [];

  const clean = ranges
    .filter(
      (r) =>
        Number.isInteger(r.surahNumber) &&
        r.surahNumber >= 1 &&
        r.surahNumber <= 114 &&
        Number.isInteger(r.fromAyah) &&
        Number.isInteger(r.toAyah) &&
        r.fromAyah >= 1 &&
        r.toAyah >= r.fromAyah,
    )
    .map((r) => ({
      userId: user.id,
      surahNumber: r.surahNumber,
      fromAyah: r.fromAyah,
      toAyah: r.toAyah,
    }));

  await prisma.$transaction([
    prisma.memorization.deleteMany({ where: { userId: user.id } }),
    prisma.memorization.createMany({ data: clean }),
  ]);

  return Response.json({ ok: true, count: clean.length });
}
