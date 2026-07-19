/**
 * Aqim seed script.
 *
 * Pulls the verified Quran text and tafsir ONCE from al-Quran Cloud (Tanzil
 * project data) and stores it locally. No Quranic text is ever generated or
 * modified — it is copied verbatim from the source and cross-checked against
 * two independent references before being treated as canonical:
 *
 *   1. A hardcoded canonical ayah-count table (SURAH_AYAH_COUNTS) — structural.
 *   2. A second, independently-maintained Uthmani edition — textual.
 *
 * Sources:
 *   - Text:   https://api.alquran.cloud/v1/quran/quran-uthmani                (Uthmani, Tanzil)
 *   - Verify: https://api.alquran.cloud/v1/quran/quran-uthmani-quran-academy  (Uthmani)
 *   - Tafsir: https://api.alquran.cloud/v1/quran/ar.muyassar                  (Tafsir al-Muyassar, King Fahd Complex)
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { SURAH_AYAH_COUNTS, TOTAL_AYAHS } from "../src/lib/surahMeta";

// Load .env when run directly via `tsx` (Prisma 7 doesn't auto-load it).
try {
  process.loadEnvFile();
} catch {
  // env may already be present in the shell
}

// Prefer a direct (unpooled) connection when available — more reliable for the
// bulk writes than a PgBouncer pooled endpoint.
const connectionString =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Bump this whenever the seed's derived data (e.g. tafsir summary format)
// changes, so deploys regenerate it even though row counts are unchanged.
const SEED_VERSION = "2";

const API = "https://api.alquran.cloud/v1";
const TEXT_EDITION = "quran-uthmani";
// Second, independently-maintained Uthmani-script edition for text cross-check.
const VERIFY_EDITION = "quran-uthmani-quran-academy";
const TAFSIR_EDITION = "ar.muyassar";
const TAFSIR_SOURCE_LABEL =
  "Tafsir al-Muyassar (King Fahd Complex) - via Tanzil / al-Quran Cloud";
const TAFSIR_SOURCE_URL = "https://quran.com/1?tafsirs=ar-tafsir-muyassar";
// English translation of the meaning (for non-Arabic speakers).
const TRANSLATION_EDITION = "en.sahih";
const TRANSLATION_SOURCE_LABEL = "Saheeh International (en.sahih)";

interface ApiAyah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  page: number;
}
interface ApiSurah {
  number: number;
  name: string; // Arabic surah name (stored verbatim)
  englishName: string; // transliteration
  englishNameTranslation: string; // English meaning
  revelationType: string;
  ayahs: ApiAyah[];
}

async function fetchQuran(edition: string): Promise<ApiSurah[] | null> {
  const res = await fetch(`${API}/quran/${edition}`);
  if (!res.ok) return null;
  const json = (await res.json()) as { data: { surahs: ApiSurah[] } };
  return json.data.surahs;
}

// Normalize Arabic for a script-independent comparison: drop all combining marks
// (harakat), then fold letters that different editions spell with equivalent but
// distinct code points (e.g. Persian Yeh U+06CC vs Arabic Yeh U+064A, alef-wasla
// U+0671 vs alef U+0627). ASCII escapes only, so the code points are exact.
function normalizeArabic(s: string): string {
  return s
    .normalize("NFC")
    .replace(/\p{M}/gu, "") // all combining marks (harakat, superscript alef, quranic annotations)
    .replace(/ء/g, "") // standalone hamza (its written placement varies across editions)
    .replace(/[ـ‌‍]/g, "") // tatweel, ZWNJ, ZWJ
    .replace(/[آأإٱ]/g, "ا") // alef madda/hamza/wasla -> alef
    .replace(/[ىیئ]/g, "ي") // alef maksura, Persian yeh, yeh-hamza -> yeh
    .replace(/[کڪ]/g, "ك") // Persian/keheh kaf -> kaf
    .replace(/ة/g, "ه") // ta marbuta -> heh
    .replace(/ؤ/g, "و") // waw-hamza -> waw
    .replace(/[^ء-ي]/gu, ""); // keep base Arabic letters only
}

async function main() {
  // Idempotency guard: skip only if ALL reference data — including the English
  // translation — is already loaded, so this is safe to run on every deploy
  // build and will backfill translations on the first run after they're added.
  const [alreadySurahs, alreadyAyahs, alreadyTranslations, versionRow] =
    await Promise.all([
      prisma.surah.count().catch(() => 0),
      prisma.quranText.count().catch(() => 0),
      prisma.translationText.count().catch(() => 0),
      prisma.meta.findUnique({ where: { key: "seedVersion" } }).catch(() => null),
    ]);
  if (
    alreadySurahs === 114 &&
    alreadyAyahs >= 6000 &&
    alreadyTranslations >= 6000 &&
    versionRow?.value === SEED_VERSION
  ) {
    console.log(
      `Already seeded (v${SEED_VERSION}: ${alreadySurahs} surahs, ${alreadyAyahs} ayahs, ${alreadyTranslations} translations) — skipping.`,
    );
    return;
  }

  console.log("Fetching Quran text, verification edition, tafsir, translation...");
  const [text, verify, tafsir, translation] = await Promise.all([
    fetchQuran(TEXT_EDITION),
    fetchQuran(VERIFY_EDITION),
    fetchQuran(TAFSIR_EDITION),
    fetchQuran(TRANSLATION_EDITION),
  ]);

  if (!text) throw new Error(`Primary edition ${TEXT_EDITION} failed to fetch`);
  if (!tafsir)
    throw new Error(`Tafsir edition ${TAFSIR_EDITION} failed to fetch`);
  if (!translation)
    throw new Error(`Translation edition ${TRANSLATION_EDITION} failed to fetch`);

  // --- Integrity cross-checks -------------------------------------------
  // Structural checks are the HARD gate (abort on failure). The textual check
  // catches corruption; small orthographic variance between editions is fine.
  const errors: string[] = [];
  if (text.length !== 114)
    errors.push(`Expected 114 surahs, got ${text.length}`);

  let totalText = 0;
  let normalizedMismatches = 0;
  let comparedAyahs = 0;
  let emptyText = 0;
  const sampleDiffs: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const s = text[i];
    const ref = SURAH_AYAH_COUNTS[i];
    const vs = verify?.[i];

    if (s.ayahs.length !== ref)
      errors.push(
        `Surah ${s.number}: ${s.ayahs.length} ayahs, reference says ${ref}`,
      );

    for (let j = 0; j < s.ayahs.length; j++) {
      totalText++;
      const a = s.ayahs[j];
      if (!a.text || a.text.trim().length === 0) emptyText++;
      const va = vs?.ayahs[j];
      if (va) {
        comparedAyahs++;
        if (normalizeArabic(a.text) !== normalizeArabic(va.text)) {
          normalizedMismatches++;
          if (sampleDiffs.length < 5)
            sampleDiffs.push(`${s.number}:${a.numberInSurah}`);
        }
      }
    }
  }

  if (totalText !== TOTAL_AYAHS)
    errors.push(`Total ayahs ${totalText} != canonical ${TOTAL_AYAHS}`);
  if (emptyText > 0) errors.push(`${emptyText} ayahs have empty text`);

  // Structural gate.
  if (errors.length > 0) {
    console.error("INTEGRITY CHECK FAILED - aborting seed:");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }

  // Textual cross-check.
  if (verify && comparedAyahs > 0) {
    const rate = normalizedMismatches / comparedAyahs;
    console.log(
      `Text cross-check vs ${VERIFY_EDITION}: ${comparedAyahs} ayahs compared, ` +
        `${normalizedMismatches} letter-level differences (${(rate * 100).toFixed(3)}%).`,
    );
    if (rate > 0.02) {
      console.warn(
        `  WARN higher-than-expected difference rate; sample ayahs: ${sampleDiffs.join(", ")}`,
      );
    } else {
      console.log(
        "  OK textual cross-check passed (< 2% orthographic variance).",
      );
    }
  } else {
    console.warn(
      `Verify edition ${VERIFY_EDITION} unavailable - relied on canonical ayah-count table only.`,
    );
  }

  console.log(
    `Structural integrity OK: 114 surahs, ${totalText} ayahs (canonical ${TOTAL_AYAHS}). Writing to database...`,
  );

  // --- Write reference data ------------------------------------------------
  const tafsirBySurah = new Map(tafsir.map((s) => [s.number, s]));
  const translationBySurah = new Map(translation.map((s) => [s.number, s]));

  // Clear existing reference data for idempotent re-seeding.
  await prisma.translationText.deleteMany();
  await prisma.tafsirText.deleteMany();
  await prisma.quranText.deleteMany();
  await prisma.surah.deleteMany();

  for (const s of text) {
    await prisma.surah.create({
      data: {
        number: s.number,
        nameArabic: s.name,
        nameEnglish: s.englishNameTranslation,
        nameTranslit: s.englishName,
        revelationType: s.revelationType,
        ayahCount: s.ayahs.length,
      },
    });

    await prisma.quranText.createMany({
      data: s.ayahs.map((a) => ({
        surahNumber: s.number,
        ayahNumber: a.numberInSurah,
        arabicText: a.text,
        juzNumber: a.juz,
        pageNumber: a.page,
      })),
    });

    const tsurah = tafsirBySurah.get(s.number);
    if (tsurah) {
      await prisma.tafsirText.createMany({
        data: tsurah.ayahs.map((a) => ({
          surahNumber: s.number,
          ayahNumber: a.numberInSurah,
          tafsirSource: TAFSIR_SOURCE_LABEL,
          sourceUrl: TAFSIR_SOURCE_URL,
          // summary = a condensation (first 1-2 sentences) of the EXISTING
          // tafsir text. No new interpretation is composed. Full text kept intact.
          summaryText: condense(a.text),
          fullText: a.text,
        })),
      });
    }

    const trsurah = translationBySurah.get(s.number);
    if (trsurah) {
      await prisma.translationText.createMany({
        data: trsurah.ayahs.map((a) => ({
          surahNumber: s.number,
          ayahNumber: a.numberInSurah,
          source: TRANSLATION_SOURCE_LABEL,
          text: a.text, // verbatim English translation of the meaning
        })),
      });
    }
    if (s.number % 20 === 0) console.log(`  ...surah ${s.number}/114`);
  }

  await prisma.meta.upsert({
    where: { key: "seedVersion" },
    create: { key: "seedVersion", value: SEED_VERSION },
    update: { value: SEED_VERSION },
  });

  const surahCount = await prisma.surah.count();
  const ayahCount = await prisma.quranText.count();
  const tafsirCount = await prisma.tafsirText.count();
  const translationCount = await prisma.translationText.count();
  console.log(
    `Seeded v${SEED_VERSION}: ${surahCount} surahs, ${ayahCount} ayahs, ${tafsirCount} tafsir, ${translationCount} translations.`,
  );
}

// Condense the existing tafsir into a concise 2-4 sentence paragraph that ends
// at a clean sentence boundary. This only TRUNCATES the sourced text — it never
// rewrites or invents content. ۔ = Arabic full stop, ، = Arabic comma.
function condense(full: string): string {
  const t = full.replace(/^﻿/, "").trim();
  const MAX = 400;
  if (t.length <= MAX) return t; // short/medium tafsir kept whole (a few sentences)

  // Prefer ending at a sentence boundary (. or Arabic full stop) past ~180 chars.
  const window = t.slice(0, MAX + 80);
  let cut = -1;
  const re = /[.۔]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(window))) {
    if (m.index >= 180 && m.index <= MAX) cut = m.index;
  }
  if (cut > -1) return t.slice(0, cut + 1).trim();

  // Otherwise end at an Arabic comma near the limit, then hard-cut, with ellipsis.
  const comma = t.lastIndexOf("،", MAX);
  if (comma >= 180) return t.slice(0, comma).trim() + "…";
  return t.slice(0, MAX).trim() + "…";
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
