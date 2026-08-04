import { getDailyExtras } from "@/lib/dailyContent";

// دعاء اليوم + حديث اليوم — deterministic daily picks from the verified
// local datasets (Hisn al-Muslim; Sahih al-Bukhari & Muslim).
export async function GET() {
  const extras = await getDailyExtras(new Date());
  return Response.json(extras, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
