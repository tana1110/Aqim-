import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";

// Timestamped memorized-ayah totals for the growth chart.
export async function GET() {
  const user = await getCurrentUser();
  const points = await prisma.memoSnapshot.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return Response.json({
    points: points.map((p) => ({
      at: p.createdAt.toISOString(),
      total: p.totalAyat,
    })),
  });
}
