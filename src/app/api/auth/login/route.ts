import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { createSession, mergeDeviceIntoAccount } from "@/lib/auth";

// Email/password sign-in. The device's anonymous history is merged into the
// account so nothing recorded before signing in is lost.
export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return Response.json({ error: "bad_credentials" }, { status: 401 });
  }

  const device = await getCurrentUser();
  if (!device.email && !device.googleSub) {
    await mergeDeviceIntoAccount(device.id, user.id);
  }
  await createSession(user.id);
  return Response.json({ ok: true, email: user.email });
}
