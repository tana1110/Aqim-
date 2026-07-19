"use client";

import { BookOpen } from "lucide-react";
import type { PassageContent } from "@/lib/types";
import { useLang } from "@/components/LanguageProvider";
import { surahName, getBismillahDisplay, cleanAyah } from "@/lib/quranDisplay";

function toArabicDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}
function num(n: number, lang: string): string {
  return lang === "ar" ? toArabicDigits(n) : String(n);
}

export function PassageCard({
  content,
  fixedLabel,
}: {
  content: PassageContent;
  fixedLabel?: string;
}) {
  const { t, lang } = useLang();

  const range =
    content.fromAyah === content.toAyah
      ? num(content.fromAyah, lang)
      : `${num(content.fromAyah, lang)}–${num(content.toAyah, lang)}`;

  const name = surahName(lang, content.surahNameArabic, content.surahNameTranslit);

  const bism = getBismillahDisplay(
    content.surahNumber,
    content.fromAyah,
    content.ayahs[0]?.arabicText ?? "",
  );

  const renderAyahs = (
    bism.skipFirstAyah ? content.ayahs.slice(1) : content.ayahs
  ).map((a, idx) => ({
    ayahNumber: a.ayahNumber,
    text:
      !bism.skipFirstAyah && idx === 0 && bism.firstAyahText != null
        ? bism.firstAyahText
        : cleanAyah(a.arabicText),
  }));

  const showTranslation = lang === "en";
  const hasTafsir = content.ayahs.some((a) => a.tafsirSummary);
  const hasTranslation = content.ayahs.some((a) => a.translation);
  const showMeaning = showTranslation ? hasTranslation : hasTafsir;

  return (
    <div className="card overflow-hidden">
      {/* Header band */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-primary-soft border-b border-border">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-quran text-xl text-primary truncate">
            {t("passage.surah")} {name}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {fixedLabel && (
            <span className="text-[10px] rounded-md bg-accent-soft text-accent px-2 py-0.5 border border-accent/40 font-bold whitespace-nowrap">
              {t("passage.fixed")}
            </span>
          )}
          <span className="text-[11px] text-muted whitespace-nowrap">
            {t("passage.ayah")} {range}
          </span>
        </div>
      </div>

      {/* Arabic text (always RTL) */}
      <div className="px-5 py-6">
        {bism.line && (
          <p className="bismillah-line" dir="rtl">
            {bism.line}
            {bism.lineIsAyahOne && (
              <span className="ayah-mark">﴿{toArabicDigits(1)}﴾</span>
            )}
          </p>
        )}
        <p className="quran-text" dir="rtl">
          {renderAyahs.map((a) => (
            <span key={a.ayahNumber}>
              {a.text}
              <span className="ayah-mark">﴿{toArabicDigits(a.ayahNumber)}﴾</span>{" "}
            </span>
          ))}
        </p>
      </div>

      {/* Meaning: tafsir (AR) or translation (EN) */}
      {showMeaning && (
        <div className="px-5 pb-5">
          <div className="rounded-2xl bg-surface-2 p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-accent mb-2">
              <BookOpen size={14} />
              {showTranslation
                ? t("passage.translation")
                : t("passage.meaningSimple")}
            </div>
            <p
              className="text-sm leading-relaxed text-foreground/90"
              dir={showTranslation ? "ltr" : "rtl"}
            >
              {content.ayahs
                .map((a) => (showTranslation ? a.translation : a.tafsirSummary))
                .filter((s): s is string => !!s)
                .join(" ")}
            </p>
            {(showTranslation
              ? content.translationSource
              : content.tafsirSource) && (
              <p className="mt-3 text-[11px] text-muted border-t border-border pt-2.5">
                {t("common.source")}:{" "}
                {showTranslation ? (
                  content.translationSource
                ) : content.tafsirSourceUrl ? (
                  <a
                    href={content.tafsirSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    {content.tafsirSource}
                  </a>
                ) : (
                  content.tafsirSource
                )}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
