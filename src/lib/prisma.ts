import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@/generated/prisma/client";

// The D1 binding only exists inside a request on Cloudflare, so the client
// can't be built at import time. `prisma` stays a plain import for every
// call site; each property access builds a fresh client for the current
// request.
//
// Deliberately NOT cached across requests (an earlier version cached by
// `env.DB` object identity, "built once per isolate"): Cloudflare Workers
// reuses the same isolate/global scope across many unrelated requests, but
// `env.DB` turned out to be the *same* binding object across them too — so
// that cache kept returning one request's PrismaClient to every later
// request sharing the isolate. The adapter holds promises/IO handles tied
// to the request that created it; once that original request finished, the
// runtime started killing later requests outright with "A promise was
// resolved or rejected from a different request context... Continuations
// for that request are unlikely to run safely and have been canceled" —
// surfacing as the exact `/api/history`, `/api/history/stats`,
// `/api/memorization`, `/api/memo-history` and `/api/streak` hangs/500s
// reported in production. Building fresh per request is the correct fix
// per Cloudflare's own per-request I/O object lifecycle rules, not just a
// workaround — see https://developers.cloudflare.com/workers/observability/errors/.
function client(): PrismaClient {
  const db = getCloudflareContext().env.DB;
  return new PrismaClient({ adapter: new PrismaD1(db) });
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const c = client();
    const value = Reflect.get(c, prop, c);
    return typeof value === "function" ? value.bind(c) : value;
  },
});
