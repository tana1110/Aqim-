// Arabic search normalization — for MATCHING only, never for display.
// Strips diacritics/tatweel and folds letter variants so users find ayat
// without typing exact harakat. The displayed text is always the verified
// original.
export function normalizeArabic(s: string): string {
  return s
    .normalize("NFC")
    .replace(/\p{M}/gu, "") // all combining marks (harakat, small signs)
    .replace(/ـ/g, "") // tatweel
    .replace(/[آأإٱ]/g, "ا") // آأإٱ → ا
    .replace(/ة/g, "ه") // ة → ه
    .replace(/[ىی]/g, "ي") // ى/فارسی ی → ي
    .replace(/ؤ/g, "و") // ؤ → و
    .replace(/ئ/g, "ي") // ئ → ي
    .replace(/\s+/g, " ")
    .trim();
}
