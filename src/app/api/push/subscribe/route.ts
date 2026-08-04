import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";

interface SubscribeBody {
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  lang?: string;
  lat?: number | null;
  lng?: number | null;
  method?: string;
  prayers?: boolean;
  wirdTime?: string | null;
  adhkar?: boolean;
  tzOffset?: number;
}

// Store/update this device's push subscription + the prefs needed to compute
// its reminder times server-side.
export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  const body = (await request.json()) as SubscribeBody;
  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return Response.json({ error: "bad_subscription" }, { status: 400 });
  }
  const data = {
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    lang: body.lang === "en" ? "en" : "ar",
    lat: body.lat ?? null,
    lng: body.lng ?? null,
    method: body.method ?? "umm_alqura",
    prayers: !!body.prayers,
    wirdTime: body.wirdTime ?? null,
    adhkar: body.adhkar ?? false,
    tzOffset: Math.max(-840, Math.min(840, Math.round(body.tzOffset ?? 0))),
    userId: user?.id ?? null,
  };
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { endpoint: sub.endpoint, ...data },
    update: data,
  });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    endpoint?: string;
  };
  if (body.endpoint) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: body.endpoint },
    });
  }
  return Response.json({ ok: true });
}
