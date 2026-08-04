import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";

// The client's on-device state, mirrored server-side so it survives
// reinstalls and follows the account. Last-writer-wins by client timestamp.

const MAX_BYTES = 200_000;

export async function GET() {
  const user = await getCurrentUser();
  const state = await prisma.userState.findUnique({
    where: { userId: user.id },
  });
  return Response.json({
    data: state ? JSON.parse(state.data) : null,
    ts: state ? Number(state.ts) : 0,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const body = (await request.json()) as {
    data?: Record<string, string>;
    ts?: number;
  };
  if (!body.data || typeof body.ts !== "number") {
    return Response.json({ error: "bad_body" }, { status: 400 });
  }
  const serialized = JSON.stringify(body.data);
  if (serialized.length > MAX_BYTES) {
    return Response.json({ error: "too_large" }, { status: 413 });
  }
  const existing = await prisma.userState.findUnique({
    where: { userId: user.id },
  });
  if (existing && Number(existing.ts) >= body.ts) {
    return Response.json({ ok: true, kept: "server" });
  }
  await prisma.userState.upsert({
    where: { userId: user.id },
    create: { userId: user.id, data: serialized, ts: BigInt(body.ts) },
    update: { data: serialized, ts: BigInt(body.ts) },
  });
  return Response.json({ ok: true, kept: "client" });
}
