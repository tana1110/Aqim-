import path from "node:path";
import { defineConfig } from "prisma/config";

// The app talks to Cloudflare D1 at runtime through the driver adapter
// (see src/lib/prisma.ts), so the CLI only needs the schema to generate the
// client and diff migrations. The local SQLite file is just a scratch target
// for any CLI command that insists on a connection.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("migrations"),
  },
  datasource: {
    url: "file:./prisma/local.db",
  },
});
