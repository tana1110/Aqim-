// Client-safe shared types (no server imports). Mirror of the server shapes
// returned by the API routes.

export interface AyahContent {
  ayahNumber: number;
  arabicText: string;
  tafsirSummary: string | null;
}

export interface PassageContent {
  surahNumber: number;
  surahNameArabic: string;
  surahNameEnglish: string;
  surahNameTranslit: string;
  fromAyah: number;
  toAyah: number;
  ayahs: AyahContent[];
  tafsirSource: string | null;
  tafsirSourceUrl: string | null;
}

export type Mode = "faraid" | "nafl" | "qiyam";

export interface ResolvedSlot {
  rakah: number;
  kind: "fatiha-only" | "suggest" | "fixed";
  label?: string;
  content: PassageContent | null;
}

export interface ResolvedPlan {
  title: string;
  titleArabic: string;
  mode: Mode;
  note?: string;
  slots: ResolvedSlot[];
  relaxed: boolean;
  exhausted: boolean;
}

export interface SurahMeta {
  number: number;
  nameArabic: string;
  nameEnglish: string;
  nameTranslit: string;
  revelationType: string;
  ayahCount: number;
}

export interface AppSettings {
  witrRakahs: number;
  noRepeatWindow: number;
  qiyamRepeatWindow: number;
  tafsirSource: string;
  font: string;
  maxAyahShort: number;
}
