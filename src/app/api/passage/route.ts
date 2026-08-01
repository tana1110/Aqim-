import { getPassageContent } from "@/lib/content";
import { getCurrentUser } from "@/lib/user";

// Resolve one passage (verified local text + tafsir) — used by the history
// page to show exactly what was recited when a row is expanded.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const surah = Number(url.searchParams.get("surah"));
  const from = Number(url.searchParams.get("from"));
  const to = Number(url.searchParams.get("to"));
  if (
    !Number.isInteger(surah) ||
    surah < 1 ||
    surah > 114 ||
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 1 ||
    to < from
  ) {
    return Response.json({ error: "bad_range" }, { status: 400 });
  }
  const user = await getCurrentUser();
  const content = await getPassageContent(
    { surahNumber: surah, fromAyah: from, toAyah: to },
    user.settings?.tafsirSource ?? "ar.muyassar",
  );
  return Response.json({ content });
}
