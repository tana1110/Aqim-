// Proxy for the King Fahd Complex per-page Quran fonts (QCF V2, as served
// by quran.com). Proxied because the origin sends no CORS headers; cached
// aggressively — the fonts are immutable.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ page: string }> },
) {
  const { page } = await params;
  const n = Number(page);
  if (!Number.isInteger(n) || n < 1 || n > 604) {
    return new Response("Not found", { status: 404 });
  }
  const res = await fetch(
    `https://quran.com/fonts/quran/hafs/v2/woff2/p${n}.woff2`,
    { cache: "force-cache" },
  );
  if (!res.ok) return new Response("Upstream error", { status: 502 });
  return new Response(res.body, {
    headers: {
      "Content-Type": "font/woff2",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
