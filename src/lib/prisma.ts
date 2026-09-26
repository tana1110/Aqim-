import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@/generated/prisma/client";

// The D1 binding only exists inside a request on Cloudflare, so the client
// can't be built at import time. `prisma` stays a plain import for every
// call site; each property access resolves the client for the current
// request's D1 binding (cached per binding, so it's built once per isolate).
const clients = new WeakMap<object, PrismaClient>();

function client(): PrismaClient {
  const db = getCloudflareContext().env.DB;
  let c = clients.get(db);
  if (!c) {
    c = new PrismaClient({ adapter: new PrismaD1(db) });
    clients.set(db, c);
  }
  return c;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const c = client();
    const value = Reflect.get(c, prop, c);
    return typeof value === "function" ? value.bind(c) : value;
  },
});
