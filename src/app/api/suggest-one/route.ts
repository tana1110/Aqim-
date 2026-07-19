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
  };
  const mode = (body.mode ?? "faraid") as Mode;

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
