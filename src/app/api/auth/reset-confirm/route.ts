import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

// Password reset, step 2: exchange a valid token for a new password.
export async function POST(request: Request) {
  const body = (await request.json()) as { token?: string; password?: string };
  const token = body.token ?? "";
  const password = body.password ?? "";
  if (!token || password.length < 6) {
    return Response.json({ error: "weak_password" }, { status: 400 });
  }
  const row = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!row || row.expiresAt < new Date()) {
    return Response.json({ error: "bad_token" }, { status: 400 });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: row.userId },
    data: { passwordHash },
  });
  await prisma.passwordResetToken.deleteMany({ where: { userId: row.userId } });
  await createSession(row.userId);
  return Response.json({ ok: true, email: row.user.email });
}
