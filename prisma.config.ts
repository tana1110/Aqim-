import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer auto-loads .env. Load it here (Node 24 built-in).
try {
  process.loadEnvFile();
} catch {
  // .env may not exist yet; env vars can also come from the shell.
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations need a DIRECT (non-pooled) connection. Prefer an explicit
    // DIRECT_URL, then Neon's unpooled URL (injected by the Vercel integration),
    // then fall back to DATABASE_URL for local dev.
    url: (process.env.DIRECT_URL ??
      process.env.DATABASE_URL_UNPOOLED ??
      process.env.DATABASE_URL) as string,
  },
});
