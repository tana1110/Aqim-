import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import {
  STREAK_EXTEND_HOURS,
  STREAK_MAX_BUFFER_HOURS,
} from "@/lib/streak";

// Server-side hourglass streak (the durable copy — survives reinstalls).

function today(tzOffsetMin: number): string {
  const d = new Date(Date.now() + tzOffsetMin * 60_000);
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

export async function GET() {
  const user = await getCurrentUser();
  const expired =
    user.streakExpiresAt != null && user.streakExpiresAt.getTime() < Date.now();
  return Response.json({
    count: expired ? 0 : user.streakCount,
    expiresAt: expired ? null : (user.streakExpiresAt?.getTime() ?? null),
  });
}

// A page was read: extend the clock; count distinct local days.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  const body = (await request.json().catch(() => ({}))) as {
    tzOffset?: number;
  };
  const tz = Math.max(-840, Math.min(840, Math.round(body.tzOffset ?? 0)));
  const now = Date.now();
  const day = today(tz);

  let count = user.streakCount;
  let base = user.streakExpiresAt?.getTime() ?? 0;
  let lastDay = user.streakLastDay;

  if (base < now) {
    // the clock ran out — the streak starts over
    count = 0;
    base = now;
    lastDay = null;
  }
  if (lastDay !== day) {
    count += 1;
    lastDay = day;
  }
  const expiresAt = Math.min(
    Math.max(base, now) + STREAK_EXTEND_HOURS * 3_600_000,
    now + STREAK_MAX_BUFFER_HOURS * 3_600_000,
  );

  await prisma.user.update({
    where: { id: user.id },
    data: {
      streakCount: count,
      streakExpiresAt: new Date(expiresAt),
      streakLastDay: lastDay,
    },
  });
  return Response.json({ count, expiresAt });
}
