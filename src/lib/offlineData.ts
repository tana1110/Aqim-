// Client-side mirror of the server's reference tables (Surah, QuranText,
// TafsirText, TranslationText) — exported once via scripts/export-offline-data.ts
// and shipped as static files under public/data/. Loaded once per session
// (fetched, then cached in memory + the browser's own HTTP/SW cache), so the
// suggestion engine and passage lookups can run with zero network and zero
// database dependency.

export interface OfflineSurah {
  number: number;
  nameArabic: string;
  nameEnglish: string;
  nameTranslit: string;
  revelationType: string;
  ayahCount: number;
}
interface OfflineAyah {
  surahNumber: number;
  ayahNumber: number;
  arabicText: string;
  juzNumber: number;
  pageNumber: number;
}
interface OfflineTafsir {
  surahNumber: number;
  ayahNumber: number;
  tafsirSource: string;
  sourceUrl: string | null;
  summaryText: string;
}
interface OfflineTranslation {
  surahNumber: number;
  ayahNumber: number;
  source: string;
  text: string;
}

interface OfflineStore {
  surahs: OfflineSurah[];
  quranByKey: Map<string, OfflineAyah>;
  tafsirByKey: Map<string, OfflineTafsir[]>;
  translationByKey: Map<string, OfflineTranslation>;
}

const key = (s: number, a: number) => `${s}:${a}`;

let store: OfflineStore | null = null;
let loading: Promise<OfflineStore> | null = null;

async function loadJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`offline data fetch failed: ${path}`);
  return res.json();
}

export async function ensureOfflineData(): Promise<OfflineStore> {
  if (store) return store;
  if (!loading) {
    loading = (async () => {
      const [surahs, quranText, tafsirText, translationText] = await Promise.all([
        loadJson<OfflineSurah[]>("/data/surahs.json"),
        loadJson<OfflineAyah[]>("/data/quranText.json"),
        loadJson<OfflineTafsir[]>("/data/tafsirText.json"),
        loadJson<OfflineTranslation[]>("/data/translationText.json"),
      ]);
      const quranByKey = new Map(
        quranText.map((a) => [key(a.surahNumber, a.ayahNumber), a]),
      );
      const tafsirByKey = new Map<string, OfflineTafsir[]>();
      for (const t of tafsirText) {
        const k = key(t.surahNumber, t.ayahNumber);
        const list = tafsirByKey.get(k);
        if (list) list.push(t);
        else tafsirByKey.set(k, [t]);
      }
      const translationByKey = new Map(
        translationText.map((t) => [key(t.surahNumber, t.ayahNumber), t]),
      );
      store = { surahs, quranByKey, tafsirByKey, translationByKey };
      return store;
    })();
  }
  return loading;
}

export async function getSurahsOffline(): Promise<OfflineSurah[]> {
  return (await ensureOfflineData()).surahs;
}

export function wordCountOffline(text: string): number {
  return text
    .replace(/^﻿/, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export interface OfflinePassage {
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
}

// Mirrors src/lib/content.ts's getPassageContent, reading from the offline
// store instead of Postgres.
export async function getPassageContentOffline(
  passage: OfflinePassage,
  tafsirSource: string,
) {
  const d = await ensureOfflineData();
  const surah = d.surahs.find((s) => s.number === passage.surahNumber);
  if (!surah) return null;

  const ayahs: {
    ayahNumber: number;
    arabicText: string;
    tafsirSummary: string | null;
    translation: string | null;
  }[] = [];
  let tafsirSourceUsed: string | null = null;
  let translationSourceUsed: string | null = null;

  for (let a = passage.fromAyah; a <= passage.toAyah; a++) {
    const ayah = d.quranByKey.get(key(passage.surahNumber, a));
    if (!ayah) continue;
    const tafsirRows = d.tafsirByKey.get(key(passage.surahNumber, a)) ?? [];
    const preferred = tafsirRows.filter(
      (t) =>
        t.tafsirSource === tafsirSource ||
        t.tafsirSource.toLowerCase().includes(tafsirSource.toLowerCase()),
    );
    const chosen = (preferred.length > 0 ? preferred : tafsirRows)[0];
    const translation = d.translationByKey.get(key(passage.surahNumber, a));
    if (chosen && !tafsirSourceUsed) tafsirSourceUsed = chosen.tafsirSource;
    if (translation && !translationSourceUsed)
      translationSourceUsed = translation.source;
    ayahs.push({
      ayahNumber: a,
      arabicText: ayah.arabicText,
      tafsirSummary: chosen?.summaryText ?? null,
      translation: translation?.text ?? null,
    });
  }

  return {
    surahNumber: surah.number,
    surahNameArabic: surah.nameArabic,
    surahNameEnglish: surah.nameEnglish,
    surahNameTranslit: surah.nameTranslit,
    fromAyah: passage.fromAyah,
    toAyah: passage.toAyah,
    ayahs,
    tafsirSource: tafsirSourceUsed,
    tafsirSourceUrl:
      d.tafsirByKey.get(key(passage.surahNumber, passage.fromAyah))?.[0]
        ?.sourceUrl ?? null,
    translationSource: translationSourceUsed,
  };
}
