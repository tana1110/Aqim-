import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { createSession, mergeDeviceIntoAccount } from "@/lib/auth";

// Google sign-in: the client sends the Google Identity Services ID token;
// we verify it against Google's tokeninfo endpoint (audience must match).
export async function POST(request: Request) {
  const clientId =
    process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return Response.json({ error: "google_not_configured" }, { status: 501 });
  }
  const body = (await request.json()) as { credential?: string };
  if (!body.credential) {
    return Response.json({ error: "bad_token" }, { status: 400 });
  }

  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(body.credential)}`,
  );
  if (!res.ok) {
    return Response.json({ error: "bad_token" }, { status: 401 });
  }
  const info = (await res.json()) as {
    aud?: string;
    sub?: string;
    email?: string;
    email_verified?: string;
  };
  if (info.aud !== clientId || !info.sub) {
    return Response.json({ error: "bad_token" }, { status: 401 });
  }

  const email =
    info.email_verified === "true" ? (info.email ?? null)?.toLowerCase() : null;

  // Find the account by Google id, then by verified email, else create/upgrade.
  let user = await prisma.user.findUnique({ where: { googleSub: info.sub } });
  if (!user && email) {
    user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleSub: info.sub },
      });
    }
  }

  const device = await getCurrentUser();
  if (!user) {
    if (!device.email && !device.googleSub) {
      user = await prisma.user.update({
        where: { id: device.id },
        data: { googleSub: info.sub, email: email ?? undefined },
      });
    } else {
      user = await prisma.user.create({
        data: {
          uid: `acct-${crypto.randomUUID()}`,
          name: "You",
          googleSub: info.sub,
          email: email ?? undefined,
          settings: { create: {} },
        },
      });
    }
  } else if (!device.email && !device.googleSub) {
    await mergeDeviceIntoAccount(device.id, user.id);
  }

  await createSession(user.id);
  return Response.json({ ok: true, email: user.email });
}
