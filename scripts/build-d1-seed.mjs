// Builds seed/*.sql for Cloudflare D1 from the verified reference data in
// public/data/*.json (exported from the original database). Run once, then:
//   npx wrangler d1 execute aqim --remote --file seed/<file>.sql
// Multi-row INSERTs are chunked well under D1's per-statement size limit.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const MAX_STATEMENT_BYTES = 80_000;

const q = (v) =>
  v === null || v === undefined
    ? "NULL"
    : typeof v === "number"
      ? String(v)
      : "'" + String(v).replace(/'/g, "''") + "'";

function build(file, table, columns, fields) {
  const rows = JSON.parse(readFileSync(`public/data/${file}.json`, "utf8"));
  const head = `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES\n`;
  const out = [];
  let batch = [];
  let size = head.length;
  for (const r of rows) {
    const tuple = "(" + fields.map((f) => q(r[f])).join(", ") + ")";
    const bytes = Buffer.byteLength(tuple) + 2;
    if (batch.length && size + bytes > MAX_STATEMENT_BYTES) {
      out.push(head + batch.join(",\n") + ";");
      batch = [];
      size = head.length;
    }
    batch.push(tuple);
    size += bytes;
  }
  if (batch.length) out.push(head + batch.join(",\n") + ";");
  writeFileSync(`seed/${table}.sql`, out.join("\n") + "\n");
  console.log(`${table}: ${rows.length} rows, ${out.length} statements`);
}

mkdirSync("seed", { recursive: true });
build("surahs", "surah",
  ["number", "nameArabic", "nameEnglish", "nameTranslit", "revelationType", "ayahCount"],
  ["number", "nameArabic", "nameEnglish", "nameTranslit", "revelationType", "ayahCount"]);
build("quranText", "quran_text",
  ["id", "surah_number", "ayah_number", "arabic_text", "juz_number", "page_number"],
  ["id", "surahNumber", "ayahNumber", "arabicText", "juzNumber", "pageNumber"]);
build("tafsirText", "tafsir_text",
  ["id", "surah_number", "ayah_number", "tafsir_source", "source_url", "summary_text", "full_text"],
  ["id", "surahNumber", "ayahNumber", "tafsirSource", "sourceUrl", "summaryText", "fullText"]);
build("translationText", "translation_text",
  ["id", "surah_number", "ayah_number", "source", "text"],
  ["id", "surahNumber", "ayahNumber", "source", "text"]);
build("adhkarText", "adhkar_text",
  ["id", "chapter_index", "chapter", "position", "text", "count", "reference", "source"],
  ["id", "chapterIndex", "chapter", "position", "text", "count", "reference", "source"]);
build("hadithText", "hadith_text",
  ["id", "collection", "number", "book", "text", "source"],
  ["id", "collection", "number", "book", "text", "source"]);
writeFileSync(
  "seed/meta.sql",
  `INSERT INTO "meta" ("key", "value") VALUES ('seedVersion', '4'), ('hadithVersion', '1');\n`,
);
console.log("meta: 2 rows");
