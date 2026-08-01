// Exact Madani page layout: per-word QCF V2 glyph codes with their real
// line numbers (1-15), from the quran.com v4 API (King Fahd Complex
// encoding). The response is immutable reference data — cached hard.

interface ApiWord {
  char_type_name: string;
  code_v2?: string;
  line_number?: number;
}
interface ApiVerse {
  verse_key: string;
  verse_number: number;
  words: ApiWord[];
}

export async function GET(request: Request) {
  const page = Number(new URL(request.url).searchParams.get("page"));
  if (!Number.isInteger(page) || page < 1 || page > 604) {
    return Response.json({ error: "bad_page" }, { status: 400 });
  }
  const res = await fetch(
    `https://api.quran.com/api/v4/verses/by_page/${page}?words=true&word_fields=code_v2,line_number&per_page=50`,
    { cache: "force-cache" },
  );
  if (!res.ok) {
    return Response.json({ error: "upstream" }, { status: 502 });
  }
  const data = (await res.json()) as { verses: ApiVerse[] };

  // lines[n] = ordered glyph words for that mushaf line.
  const lines: Record<number, { c: string; s: number; a: number }[]> = {};
  const starts: { surah: number; firstLine: number }[] = [];
  for (const v of data.verses ?? []) {
    const [s, a] = v.verse_key.split(":").map(Number);
    let firstLine: number | null = null;
    for (const w of v.words) {
      if (!w.code_v2 || !w.line_number) continue;
      (lines[w.line_number] ??= []).push({ c: w.code_v2, s, a });
      if (firstLine == null || w.line_number < firstLine)
        firstLine = w.line_number;
    }
    if (v.verse_number === 1 && firstLine != null) {
      starts.push({ surah: s, firstLine });
    }
  }

  return Response.json(
    { page, lines, starts },
    {
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    },
  );
}
