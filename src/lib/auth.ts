import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Optional accounts: the app is fully usable anonymously (per-device uid);
// an account only makes the same data follow the user across devices.

const SESSION_COOKIE = "aqim-session";
const SESSION_DAYS = 180;

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await prisma.authSession.create({ data: { token, userId, expiresAt } });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 3600,
    path: "/",
  });
}

export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.authSession.findUnique({
    where: { token },
    include: { user: { include: { settings: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.authSession.deleteMany({ where: { token } });
  }
  store.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
}

// When an anonymous device logs into an existing account, move the device's
// history over so nothing is lost. The account's own memorization wins if it
// already has one.
export async function mergeDeviceIntoAccount(
  deviceUserId: number,
  accountUserId: number,
) {
  if (deviceUserId === accountUserId) return;
  await prisma.recitationHistory.updateMany({
    where: { userId: deviceUserId },
    data: { userId: accountUserId },
  });
  await prisma.memoSnapshot.updateMany({
    where: { userId: deviceUserId },
    data: { userId: accountUserId },
  });
  const accountMemo = await prisma.memorization.count({
    where: { userId: accountUserId },
  });
  if (accountMemo === 0) {
    await prisma.memorization.updateMany({
      where: { userId: deviceUserId },
      data: { userId: accountUserId },
    });
  }
}

export function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
