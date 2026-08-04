import { getDailyAyah, getDailyExtras } from "@/lib/dailyContent";

// The archive: past days' ayah/du'a/hadith, recomputed deterministically
// (the picks are pure functions of the date, so nothing is ever lost).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = Math.min(
    30,
    Math.max(1, Number(url.searchParams.get("days")) || 14),
  );
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const [ayah, extras] = await Promise.all([
      getDailyAyah(d),
      getDailyExtras(d),
    ]);
    out.push({
      date: d.toISOString().slice(0, 10),
      ayah,
      dua: extras.dua,
      hadith: extras.hadith,
    });
  }
  return Response.json(
    { days: out },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
