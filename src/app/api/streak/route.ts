import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import {
  SHIELD_EVERY_DAYS,
  SHIELD_MAX,
  evaluateStreak,
  localDayKey,
} from "@/lib/streak";

// Server-side daily streak (the durable copy — survives reinstalls).
// The real daily reading saves the day; the spark hour after midnight
// can rescue a missed night, and earned rukhsa shields silently cover
// a fully missed day. Nothing accumulates.

function tzOf(v: unknown): number {
  return Math.max(-840, Math.min(840, Math.round(Number(v) || 0)));
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const url = new URL(request.url);
  const tzParam = url.searchParams.get("tz");
  let { streakCount: count, streakLastDay: lastDay, streakShields: shields } =
    user;
  // With the client's timezone we can settle shield spending durably;
  // without it we return the raw state and the client evaluates locally.
  if (tzParam != null) {
    const ev = evaluateStreak(
      { count, lastDay, shields },
      Date.now(),
      tzOf(tzParam),
    );
    if (ev.spent > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { streakLastDay: ev.lastDay, streakShields: ev.shields },
      });
      ({ count, lastDay, shields } = ev);
    }
  }
  return Response.json({ count, lastDay, shields });
}

// The day's reading is done: mark today (or start over if the streak broke).
export async function POST(request: Request) {
  const user = await getCurrentUser();
  const body = (await request.json().catch(() => ({}))) as {
    tzOffset?: number;
  };
  const tz = tzOf(body.tzOffset);
  const now = Date.now();
  const day = localDayKey(now, tz);

  const ev = evaluateStreak(
    {
      count: user.streakCount,
      lastDay: user.streakLastDay,
      shields: user.streakShields,
    },
    now,
    tz,
  );
  let { count, lastDay, shields } = ev;

  if (count <= 0 || !lastDay) {
    // broken (or never started) — this reading begins a new streak
    count = 1;
    lastDay = day;
  } else if (lastDay !== day) {
    // still alive (normal day, or saved during the spark hour)
    count += 1;
    lastDay = day;
    // every full week of streak earns one rukhsa shield (capped)
    if (count % SHIELD_EVERY_DAYS === 0) {
      shields = Math.min(SHIELD_MAX, shields + 1);
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      streakCount: count,
      streakLastDay: lastDay,
      streakShields: shields,
    },
  });
  return Response.json({ count, lastDay, shields });
}
