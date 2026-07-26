import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { computeTimes, type MethodKey } from "@/lib/reminder";
import { translate, type Lang } from "@/lib/i18n";

// Called every few minutes by an external scheduler. Sends web-push
// notifications whose local time has arrived: prayer reminders (5 min
// before), the daily wird time, and morning/evening adhkar nudges.
// Times are computed here from each subscription's stored coordinates.

const LEAD_MS = 5 * 60 * 1000;
const WINDOW_MS = 10 * 60 * 1000; // send if due within the last 10 minutes
const ADHKAR_MORNING = "07:00";
const ADHKAR_EVENING = "17:30";

function localDayKey(now: number, tzOffsetMin: number): string {
  const d = new Date(now + tzOffsetMin * 60_000);
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

// Epoch ms of "HH:MM" local time today (per tz offset).
function localTimeToday(now: number, tzOffsetMin: number, hhmm: string): number {
  const local = new Date(now + tzOffsetMin * 60_000);
  const [hh, mm] = hhmm.split(":").map(Number);
  const target = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    hh || 0,
    mm || 0,
  );
  return target - tzOffsetMin * 60_000;
}

function due(now: number, at: number): boolean {
  return at <= now && now - at < WINDOW_MS;
}

export async function POST(request: Request) {
  if (request.headers.get("x-cron-key") !== process.env.CRON_SECRET) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    return Response.json({ error: "not_configured" }, { status: 501 });
  }
  webpush.setVapidDetails("mailto:jumanaomer74@gmail.com", pub, priv);

  const subs = await prisma.pushSubscription.findMany();
  const now = Date.now();
  let sent = 0;

  for (const sub of subs) {
    const l = (sub.lang === "en" ? "en" : "ar") as Lang;
    const day = localDayKey(now, sub.tzOffset);
    let lastSent: Record<string, boolean> = {};
    try {
      lastSent = JSON.parse(sub.lastSent);
    } catch {}
    // keep only today's dedupe entries
    for (const k of Object.keys(lastSent)) {
      if (!k.startsWith(day + ":")) delete lastSent[k];
    }

    const queue: { key: string; title: string; body: string; url: string }[] =
      [];

    if (sub.prayers && sub.lat != null && sub.lng != null) {
      for (const dayOffset of [0, -1]) {
        // compute for local today (and yesterday to cover midnight edges)
        const ref = new Date(now + sub.tzOffset * 60_000);
        ref.setUTCDate(ref.getUTCDate() + dayOffset);
        const times = computeTimes(
          sub.lat,
          sub.lng,
          sub.method as MethodKey,
          new Date(
            Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate(), 12) -
              sub.tzOffset * 60_000,
          ),
        );
        for (const [key, time] of Object.entries(times)) {
          const at = time.getTime() - LEAD_MS;
          if (due(now, at)) {
            queue.push({
              key: `${day}:prayer-${key}`,
              title: translate(l, "reminder.notifTitle", {
                prayer: translate(l, `prayer.${key}`),
              }),
              body: translate(l, "reminder.notifBody"),
              url: "/home",
            });
          }
          // ~25 minutes after the adhan: after-prayer adhkar + tasbih.
          // Tapping the notification opens that exact section.
          if (sub.adhkar && due(now, time.getTime() + 25 * 60_000)) {
            queue.push({
              key: `${day}:aftersalah-${key}`,
              title: translate(l, "adhkar.salah"),
              body: translate(l, "adhkar.salahNotifBody"),
              url: "/adhkar?goto=salah",
            });
          }
        }
      }
    }

    if (sub.wirdTime && due(now, localTimeToday(now, sub.tzOffset, sub.wirdTime))) {
      queue.push({
        key: `${day}:wird`,
        title: translate(l, "wird.notifTitle"),
        body: translate(l, "wird.notifBody"),
        url: "/quran",
      });
    }

    if (sub.adhkar) {
      if (due(now, localTimeToday(now, sub.tzOffset, ADHKAR_MORNING))) {
        queue.push({
          key: `${day}:adhkar-am`,
          title: translate(l, "adhkar.morning"),
          body: translate(l, "adhkar.notifBody"),
          url: "/adhkar",
        });
      }
      if (due(now, localTimeToday(now, sub.tzOffset, ADHKAR_EVENING))) {
        queue.push({
          key: `${day}:adhkar-pm`,
          title: translate(l, "adhkar.evening"),
          body: translate(l, "adhkar.notifBody"),
          url: "/adhkar",
        });
      }
    }

    let dirty = false;
    for (const n of queue) {
      if (lastSent[n.key]) continue;
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({ title: n.title, body: n.body, url: n.url }),
        );
        lastSent[n.key] = true;
        dirty = true;
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await prisma.pushSubscription.deleteMany({
            where: { endpoint: sub.endpoint },
          });
        }
        break;
      }
    }
    if (dirty) {
      await prisma.pushSubscription
        .update({
          where: { endpoint: sub.endpoint },
          data: { lastSent: JSON.stringify(lastSent) },
        })
        .catch(() => undefined);
    }
  }

  return Response.json({ ok: true, subscriptions: subs.length, sent });
}
