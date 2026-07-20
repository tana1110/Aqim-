import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultUser } from "@/lib/user";
import { selectPassages, type Passage } from "@/lib/selection";
import { getPassageContent } from "@/lib/content";
import type { Mode } from "@/lib/prayers";

// Suggest a single alternative passage for one "suggest" slot, avoiding the
// passages already shown in the current plan.
export async function POST(request: Request) {
  const user = await getOrCreateDefaultUser();
  const body = (await request.json()) as {
    mode?: Mode;
    exclude?: Passage[];
    focus?: {
      surahNumber: number;
      fromAyah: number | null;
      toAyah: number | null;
      repeat: boolean;
      chunk: number;
    } | null;
  };
  const mode = (body.mode ?? "faraid") as Mode;
  const focus =
    body.focus && Number.isInteger(body.focus.surahNumber)
      ? {
          surahNumber: body.focus.surahNumber,
          fromAyah: body.focus.fromAyah ?? null,
          toAyah: body.focus.toAyah ?? null,
          repeat: !!body.focus.repeat,
          chunk: Math.min(30, Math.max(1, body.focus.chunk ?? 5)),
        }
      : null;

  const settings = await prisma.settings.findUnique({
    where: { userId: user.id },
  });

  const result = await selectPassages(
    user.id,
    mode,
    1,
    {
      noRepeatWindow: settings?.noRepeatWindow ?? 5,
      qiyamRepeatWindow: settings?.qiyamRepeatWindow ?? 7,
      maxAyahShort: settings?.maxAyahShort ?? 10,
    },
    body.exclude ?? [],
    focus,
  );

  const passage = result.passages[0];
  if (!passage) {
    return Response.json({ content: null, exhausted: true });
  }

  const content = await getPassageContent(
    passage,
    settings?.tafsirSource ?? "ar.muyassar",
  );
  return Response.json({ content, relaxed: result.relaxed, exhausted: false });
}
