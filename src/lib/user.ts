import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE = "aqim-uid";
const TWO_YEARS = 60 * 60 * 24 * 730;

// Resolve the current user from the per-device `aqim-uid` cookie (assigned by
// src/proxy.ts on first visit), creating their row + default settings on first
// use. Each device/browser therefore gets its own dashboard.
export async function getCurrentUser() {
  // A signed-in session (optional) takes precedence over the device uid,
  // so the same account sees the same data on every device.
  try {
    const { getSessionUser } = await import("@/lib/auth");
    const sessionUser = await getSessionUser();
    if (sessionUser) {
      if (!sessionUser.settings) {
        await prisma.settings
          .create({ data: { userId: sessionUser.id } })
          .catch(() => undefined);
      }
      return sessionUser;
    }
  } catch {}

  const store = await cookies();
  let uid = store.get(COOKIE)?.value;

  if (!uid) {
    // Proxy normally sets this before we run; belt-and-braces fallback for
    // route handlers (where setting cookies is allowed).
    uid = crypto.randomUUID();
    try {
      store.set(COOKIE, uid, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: TWO_YEARS,
        path: "/",
      });
    } catch {
      // read-only context — the ephemeral uid still scopes this request
    }
  }

  let user = await prisma.user.findUnique({
    where: { uid },
    include: { settings: true },
  });

  if (!user) {
    try {
      user = await prisma.user.create({
        data: { uid, name: "You", settings: { create: {} } },
        include: { settings: true },
      });
    } catch {
      // Unique race (two first-visit requests in parallel) — fetch the winner.
      user = await prisma.user.findUnique({
        where: { uid },
        include: { settings: true },
      });
    }
  } else if (!user.settings) {
    await prisma.settings
      .create({ data: { userId: user.id } })
      .catch(() => undefined);
    user = await prisma.user.findUnique({
      where: { uid },
      include: { settings: true },
    });
  }

  if (!user) throw new Error("Could not resolve user");
  return user;
}

// Back-compat alias (older routes import this name).
export const getOrCreateDefaultUser = getCurrentUser;
