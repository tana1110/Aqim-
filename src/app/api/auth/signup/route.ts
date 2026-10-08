import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { createSession, firstName, validEmail } from "@/lib/auth";

// Create an email/password account. If the current device user is still
// anonymous, it is UPGRADED in place — all existing data stays attached.
export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    name?: string;
    username?: string;
  };
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const name = (body.name ?? "").trim().slice(0, 60);
  // Onboarding sign-up sends a username: kept exactly as typed (it's what
  // the greeting and home header show), not shortened to a first name.
  const username = (body.username ?? "").trim().replace(/\s+/g, " ").slice(0, 30);

  if (!validEmail(email)) {
    return Response.json({ error: "bad_email" }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json({ error: "weak_password" }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ error: "email_taken" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const device = await getCurrentUser();
  const displayName = username || firstName(name) || "You";

  let user;
  if (!device.email && !device.googleSub) {
    user = await prisma.user.update({
      where: { id: device.id },
      data: {
        email,
        passwordHash,
        ...(username || name ? { name: displayName } : {}),
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        uid: `acct-${crypto.randomUUID()}`,
        name: displayName,
        email,
        passwordHash,
        settings: { create: {} },
      },
    });
  }
  await createSession(user.id);
  return Response.json({
    ok: true,
    email: user.email,
    name: user.name,
    isNewAccount: true,
  });
}
