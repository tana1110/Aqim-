import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultUser } from "@/lib/user";

// Log a passage the user actually recited ("I used this").
export async function POST(request: Request) {
  const user = await getOrCreateDefaultUser();
  const body = (await request.json()) as {
    prayerType?: string;
    mode?: string;
    rakahNumber?: number;
    surahNumber?: number;
    fromAyah?: number;
    toAyah?: number;
  };

  if (
    !body.surahNumber ||
    !body.fromAyah ||
    !body.toAyah ||
    body.fromAyah > body.toAyah
  ) {
    return Response.json({ error: "Invalid passage" }, { status: 400 });
  }

  const entry = await prisma.recitationHistory.create({
    data: {
      userId: user.id,
      prayerType: body.prayerType ?? "unknown",
      mode: body.mode ?? "faraid",
      rakahNumber: body.rakahNumber ?? 1,
      surahNumber: body.surahNumber,
      fromAyah: body.fromAyah,
      toAyah: body.toAyah,
    },
  });

  return Response.json({ ok: true, entry });
}

// Recent history list.
export async function GET() {
  const user = await getOrCreateDefaultUser();
  const history = await prisma.recitationHistory.findMany({
    where: { userId: user.id },
    orderBy: { usedAt: "desc" },
    take: 50,
  });
  return Response.json({ history });
}
