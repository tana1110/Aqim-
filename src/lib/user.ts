import { prisma } from "@/lib/prisma";

// Aqim runs as a single-user local app. This returns the one user (creating it
// with default settings on first use). Extendable to multi-user later.
export async function getOrCreateDefaultUser() {
  let user = await prisma.user.findFirst({
    orderBy: { id: "asc" },
    include: { settings: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "You",
        settings: { create: {} }, // defaults from schema
      },
      include: { settings: true },
    });
  } else if (!user.settings) {
    await prisma.settings.create({ data: { userId: user.id } });
    user = await prisma.user.findFirst({
      where: { id: user.id },
      include: { settings: true },
    });
  }

  return user!;
}
