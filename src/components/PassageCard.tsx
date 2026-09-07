"use client";

import { useState } from "react";
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
  bare = false,
}: {
  content: PassageContent;
  fixedLabel?: string;
  // Skip the outer card chrome (border/header band) so two passages can be
  // embedded together inside one shared container — see CombinedSlots.
  bare?: boolean;
}) {
  const { t, lang } = useLang();
  const [expanded, setExpanded] = useState(false);

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

  const header = (
    <div
      className={
        bare
          ? "flex items-center justify-between gap-3 px-1 pb-2"
          : "flex items-center justify-between gap-3 px-5 py-3.5 bg-primary-soft border-b border-border"
      }
    >
      <div className="flex items-baseline gap-2 min-w-0">
        <span
          className={
            bare
              ? "text-sm font-bold text-primary truncate"
              : "text-lg font-bold text-primary truncate"
          }
        >
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
  );

  // Same dense, justified, tight-leading rendering as the Quran reading
  // page (the .fit-quran ruleset) — one shared look for Quranic text
  // everywhere in the app, not a separate stretched-out style here.
  const body = (
    <div className={bare ? "px-1" : "px-5 py-6"}>
      {bism.line && (
        <p className="bismillah-line !border-b-0 !mb-2" dir="rtl">
          {bism.line}
          {bism.lineIsAyahOne && (
            <span className="ayah-mark">{"۝" + toArabicDigits(1)}</span>
          )}
        </p>
      )}
      <div className="fit-quran" style={{ fontSize: "1.7rem" }}>
        <p className="quran-text" dir="rtl">
          {renderAyahs.map((a) => (
            <span key={a.ayahNumber}>
              {a.text}
              <span className="ayah-mark text-accent">
                {"۝" + toArabicDigits(a.ayahNumber)}
              </span>{" "}
            </span>
          ))}
        </p>
      </div>
    </div>
  );

  const meaning = showMeaning && (
    <div className={bare ? "px-1 pb-1" : "px-5 pb-5"}>
      <div className="rounded-2xl bg-surface-2 p-4">
        <div className="flex items-center gap-1.5 text-xs font-bold text-accent mb-2">
          <BookOpen size={14} />
          {showTranslation ? t("passage.translation") : t("passage.meaningSimple")}
        </div>
        {(() => {
          const meaningText = content.ayahs
            .map((a) => (showTranslation ? a.translation : a.tafsirSummary))
            .filter((s): s is string => !!s)
            .join(" ");
          const clampable = meaningText.length > 160;
          return (
            <>
              <p
                className={`text-sm leading-relaxed text-foreground/90 ${
                  clampable && !expanded ? "line-clamp-3" : ""
                }`}
                dir={showTranslation ? "ltr" : "rtl"}
              >
                {meaningText}
              </p>
              {clampable && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="mt-1.5 text-xs font-bold text-accent hover:opacity-80"
                >
                  {expanded ? t("passage.less") : t("passage.more")}
                </button>
              )}
            </>
          );
        })()}
        {(showTranslation ? content.translationSource : content.tafsirSource) && (
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
  );

  if (bare) {
    return (
      <div>
        {header}
        {body}
        {meaning}
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {header}
      {body}
      {meaning}
    </div>
  );
}
