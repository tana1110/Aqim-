import { buildSuggestion, type SuggestionRequest } from "@/lib/plan";
import { getOrCreateDefaultUser } from "@/lib/user";
import type { Mode } from "@/lib/prayers";
import type { Passage } from "@/lib/selection";

const MODES: Mode[] = ["faraid", "nafl", "qiyam"];

// Produce a full recitation plan for a prayer + mode.
export async function POST(request: Request) {
  const user = await getOrCreateDefaultUser();
  const body = (await request.json()) as {
    mode?: string;
    prayer?: string;
    rakahs?: number;
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
  if (!MODES.includes(mode)) {
    return Response.json({ error: "Invalid mode" }, { status: 400 });
  }

  const req: SuggestionRequest = {
    mode,
    prayer: body.prayer,
    rakahs: body.rakahs,
    exclude: Array.isArray(body.exclude) ? body.exclude : [],
    focus:
      body.focus && Number.isInteger(body.focus.surahNumber)
        ? {
            surahNumber: body.focus.surahNumber,
            fromAyah: body.focus.fromAyah ?? null,
            toAyah: body.focus.toAyah ?? null,
            repeat: !!body.focus.repeat,
            chunk: Math.min(30, Math.max(1, body.focus.chunk ?? 5)),
          }
        : null,
  };

  const plan = await buildSuggestion(user.id, req);
  return Response.json({ plan });
}
