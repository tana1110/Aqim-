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

  // Record a growth snapshot (merged-interval ayah total) whenever it changes,
  // powering the progress-over-time chart.
  const bySurah = new Map<number, [number, number][]>();
  for (const r of clean) {
    const l = bySurah.get(r.surahNumber) ?? [];
    l.push([r.fromAyah, r.toAyah]);
    bySurah.set(r.surahNumber, l);
  }
  let totalAyat = 0;
  for (const list of bySurah.values()) {
    list.sort((a, b) => a[0] - b[0]);
    let [cs, ce] = [-1, -2];
    for (const [a, b] of list) {
      if (a <= ce + 1) ce = Math.max(ce, b);
      else {
        if (cs >= 0) totalAyat += ce - cs + 1;
        [cs, ce] = [a, b];
      }
    }
    if (cs >= 0) totalAyat += ce - cs + 1;
  }
  const last = await prisma.memoSnapshot.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (!last || last.totalAyat !== totalAyat) {
    await prisma.memoSnapshot.create({
      data: { userId: user.id, totalAyat },
    });
  }

  return Response.json({ ok: true, count: clean.length, totalAyat });
}
