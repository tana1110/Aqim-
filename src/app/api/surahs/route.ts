import { prisma } from "@/lib/prisma";

// List all surah metadata (for the setup picker). Reference data only.
export async function GET() {
  const surahs = await prisma.surah.findMany({ orderBy: { number: "asc" } });
  return Response.json({ surahs });
}
