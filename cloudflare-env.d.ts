import type { PrismaD1 } from "@prisma/adapter-d1";

// Only the bindings Aqim uses. Deliberately not `wrangler types`: its output
// redeclares browser globals (e.g. Response.json() -> unknown) project-wide
// and breaks the client components.
declare global {
  interface CloudflareEnv {
    DB: ConstructorParameters<typeof PrismaD1>[0];
  }
}

export {};
