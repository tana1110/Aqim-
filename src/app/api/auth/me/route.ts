import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  return Response.json({
    account: user
      ? {
          email: user.email,
          name: user.name === "You" ? null : user.name,
          hasGoogle: !!user.googleSub,
        }
      : null,
  });
}

// Update the signed-in account's display name.
export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "not_signed_in" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = (body.name ?? "").trim().slice(0, 60);
  if (!name) return Response.json({ error: "bad_name" }, { status: 400 });

  await prisma.user.update({ where: { id: user.id }, data: { name } });
  return Response.json({ ok: true, name });
}
