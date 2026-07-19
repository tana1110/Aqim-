import { NextRequest, NextResponse } from "next/server";

const COOKIE = "aqim-uid";
const TWO_YEARS = 60 * 60 * 24 * 730;

// Assigns each device/browser a private anonymous id on first visit, so every
// visitor gets their own dashboard (memorization, history, settings). The page
// request receives the cookie before any client-side API calls fire, so all
// subsequent requests carry a stable identity.
export function proxy(request: NextRequest) {
  if (request.cookies.get(COOKIE)?.value) return NextResponse.next();

  const uid = crypto.randomUUID();

  // Forward the cookie to this request's handlers too, not just future ones.
  const headers = new Headers(request.headers);
  const existing = headers.get("cookie");
  headers.set("cookie", existing ? `${existing}; ${COOKIE}=${uid}` : `${COOKIE}=${uid}`);

  const res = NextResponse.next({ request: { headers } });
  res.cookies.set(COOKIE, uid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TWO_YEARS,
    path: "/",
  });
  return res;
}

export const config = {
  // Everything except static assets.
  matcher: ["/((?!_next/|.*\\.).*)"],
};
