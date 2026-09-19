import { SW_SCRIPT } from "@/lib/swScript";

// Served as a route handler rather than a static /public/sw.js file — see
// swScript.ts for why: a browser only checks for a new service worker by
// diffing this file's own bytes, so it needs to change on every deploy,
// not only on deploys that happen to touch the worker's own logic.
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now());

export async function GET() {
  return new Response(`// build: ${BUILD_ID}\n${SW_SCRIPT}`, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // A service worker script must be re-validated on (almost) every
      // check — an HTTP-level cache hit here would hide a new deploy just
      // as effectively as the byte-diff problem this file exists to avoid.
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/",
    },
  });
}
