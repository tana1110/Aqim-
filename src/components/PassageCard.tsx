import { BookOpen } from "lucide-react";
import type { PassageContent } from "@/lib/types";

function toArabicDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

export function PassageCard({
  content,
  fixedLabel,
}: {
  content: PassageContent;
  fixedLabel?: string;
}) {
  const range =
    content.fromAyah === content.toAyah
      ? toArabicDigits(content.fromAyah)
      : `${toArabicDigits(content.fromAyah)}–${toArabicDigits(content.toAyah)}`;

  const hasTafsir = content.ayahs.some((a) => a.tafsirSummary);

  return (
    <div className="card overflow-hidden">
      {/* Header band */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-primary-soft border-b border-border">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-quran text-xl text-primary truncate">
            سورة {content.surahNameArabic}
          </span>
          <span className="text-[11px] text-muted truncate">
            {content.surahNameTranslit}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {fixedLabel && (
            <span className="text-[10px] rounded-md bg-accent-soft text-accent px-2 py-0.5 border border-accent/40 font-bold whitespace-nowrap">
              ثابتة
            </span>
          )}
          <span className="text-[11px] text-muted whitespace-nowrap">
            آية {range}
          </span>
        </div>
      </div>

      {/* Arabic text */}
      <div className="px-5 py-6">
        <p className="quran-text" dir="rtl">
          {content.ayahs.map((a) => (
            <span key={a.ayahNumber}>
              {a.arabicText}
              <span className="ayah-mark">﴿{toArabicDigits(a.ayahNumber)}﴾</span>{" "}
            </span>
          ))}
        </p>
      </div>

      {/* Tafsir */}
      {hasTafsir && (
        <div className="px-5 pb-5">
          <div className="rounded-2xl bg-surface-2 p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-accent mb-2">
              <BookOpen size={14} />
              المعنى المبسّط
            </div>
            <div className="space-y-1.5 text-sm leading-relaxed text-foreground/90">
              {content.ayahs.map((a) =>
                a.tafsirSummary ? (
                  <p key={a.ayahNumber}>
                    <span className="text-accent font-bold">
                      {toArabicDigits(a.ayahNumber)}.
                    </span>{" "}
                    {a.tafsirSummary}
                  </p>
                ) : null,
              )}
            </div>
            {content.tafsirSource && (
              <p className="mt-3 text-[11px] text-muted border-t border-border pt-2.5">
                المصدر:{" "}
                {content.tafsirSourceUrl ? (
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
