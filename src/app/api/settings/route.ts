import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultUser } from "@/lib/user";

export async function GET() {
  const user = await getOrCreateDefaultUser();
  return Response.json({ settings: user.settings });
}

export async function PUT(request: Request) {
  const user = await getOrCreateDefaultUser();
  const body = (await request.json()) as {
    witrRakahs?: number;
    noRepeatWindow?: number;
    qiyamRepeatWindow?: number;
    tafsirSource?: string;
    font?: string;
    maxAyahShort?: number;
  };

  const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
  };

  const current = user.settings!;
  const data = {
    witrRakahs: clampInt(body.witrRakahs, 1, 11, current.witrRakahs),
    noRepeatWindow: clampInt(body.noRepeatWindow, 1, 100, current.noRepeatWindow),
    qiyamRepeatWindow: clampInt(
      body.qiyamRepeatWindow,
      1,
      100,
      current.qiyamRepeatWindow,
    ),
    tafsirSource: body.tafsirSource ?? current.tafsirSource,
    font: body.font ?? current.font,
    maxAyahShort: clampInt(body.maxAyahShort, 3, 50, current.maxAyahShort),
  };

  const settings = await prisma.settings.update({
    where: { userId: user.id },
    data,
  });

  return Response.json({ settings });
}
