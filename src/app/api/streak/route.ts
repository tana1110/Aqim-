import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { localDayKey, streakAlive } from "@/lib/streak";

// Server-side daily streak (the durable copy — survives reinstalls).
// One page a day before local midnight keeps it; a one-hour spark
// window after midnight can still rescue it. Nothing accumulates.

export async function GET() {
  const user = await getCurrentUser();
  // Raw state — the client evaluates aliveness in its own timezone.
  return Response.json({
    count: user.streakCount,
    lastDay: user.streakLastDay,
  });
}

// A page was read: mark today done (or start over if the streak broke).
export async function POST(request: Request) {
  const user = await getCurrentUser();
  const body = (await request.json().catch(() => ({}))) as {
    tzOffset?: number;
  };
  const tz = Math.max(-840, Math.min(840, Math.round(body.tzOffset ?? 0)));
  const now = Date.now();
  const day = localDayKey(now, tz);

  let count = user.streakCount;
  let lastDay = user.streakLastDay;

  if (!streakAlive(lastDay, now, tz) || count <= 0) {
    // broken (or never started) — this page begins a new streak
    count = 1;
    lastDay = day;
  } else if (lastDay !== day) {
    // still alive (normal day, or saved during the spark hour)
    count += 1;
    lastDay = day;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { streakCount: count, streakLastDay: lastDay },
  });
  return Response.json({ count, lastDay });
}
