"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/components/LanguageProvider";
import { surahName, cleanAyah } from "@/lib/quranDisplay";

// The daily archive: every past day's ayah, du'a, and hadith — recomputed
// deterministically from the verified datasets, so nothing is ever lost.

interface ArchiveDay {
  date: string;
  ayah: {
    surahNumber: number;
    ayahNumber: number;
    arabicText: string;
    surahNameArabic: string;
    surahNameTranslit: string;
  } | null;
  dua: {
    text: string;
    reference: string | null;
    source: string;
    chapter: string;
  } | null;
  hadith: {
    text: string;
    collection: string;
    number: number;
    source: string;
  } | null;
}

export default function ArchivePage() {
  const { t, lang } = useLang();
  const [days, setDays] = useState<ArchiveDay[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/archive?days=14")
      .then((r) => r.json())
      .then((d) => setDays(d.days ?? []))
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <div className="card p-6 text-center mt-6 space-y-3">
        <p className="text-sm text-muted">{t("common.loadFailed")}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary px-6 py-2 text-sm"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }
  // Skeleton shaped like the real day-cards (the archive recompute takes a
  // moment; a contentless spinner would feel slower than it is).
  if (!days)
    return (
      <div className="space-y-6 pt-2 max-w-3xl" aria-busy>
        <div>
          <h1 className="text-xl font-bold mb-1">{t("archive.title")}</h1>
          <p className="text-sm text-muted">{t("archive.subtitle")}</p>
        </div>
        {[0, 1, 2].map((i) => (
          <section key={i} className="space-y-2.5 animate-pulse">
            <div className="h-3 w-32 rounded-full bg-surface-2 mx-1" />
            <div className="card divide-y divide-border overflow-hidden">
              {[0, 1, 2].map((j) => (
                <div key={j} className="p-4 space-y-2.5">
                  <div className="h-2.5 w-16 rounded-full bg-surface-2" />
                  <div className="h-4 w-full rounded-full bg-surface-2" />
                  <div className="h-4 w-3/4 rounded-full bg-surface-2" />
                  <div className="h-2.5 w-40 rounded-full bg-surface-2" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );

  const fmtDate = (iso: string) =>
    new Date(iso + "T12:00:00Z").toLocaleDateString(
      lang === "ar" ? "ar" : "en",
      { weekday: "long", day: "numeric", month: "long" },
    );

  return (
    <div className="space-y-6 pt-2 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold mb-1">{t("archive.title")}</h1>
        <p className="text-sm text-muted">{t("archive.subtitle")}</p>
      </div>

      {days.map((d) => (
        <section key={d.date} className="space-y-2.5">
          <div className="text-xs font-bold text-muted px-1">
            {fmtDate(d.date)}
          </div>
          <div className="card divide-y divide-border overflow-hidden">
            {d.ayah && (
              <div className="p-4">
                <div className="text-[11px] font-bold text-muted mb-2">
                  {t("home.dailyAyah")}
                </div>
                <p
                  className="font-quran text-lg leading-[2] text-foreground"
                  dir="rtl"
                >
                  {cleanAyah(d.ayah.arabicText)}
                </p>
                <div className="text-[11px] text-muted mt-2">
                  {t("passage.surah")}{" "}
                  {surahName(
                    lang,
                    d.ayah.surahNameArabic,
                    d.ayah.surahNameTranslit,
                  )}{" "}
                  · {t("passage.ayah")} {d.ayah.ayahNumber}
                </div>
              </div>
            )}
            {d.dua && (
              <div className="p-4">
                <div className="text-[11px] font-bold text-muted mb-2">
                  {t("daily.dua")}
                </div>
                <p
                  className="font-quran text-[17px] leading-[1.95] text-foreground"
                  dir="rtl"
                >
                  {d.dua.text}
                </p>
                <div className="text-[11px] text-muted mt-2">
                  {d.dua.reference ? d.dua.reference + " · " : ""}
                  {d.dua.source}
                </div>
              </div>
            )}
            {d.hadith && (
              <div className="p-4">
                <div className="text-[11px] font-bold text-muted mb-2">
                  {t("daily.hadith")}
                </div>
                <p
                  className="font-quran text-[16px] leading-[1.9] text-foreground"
                  dir="rtl"
                >
                  {d.hadith.text}
                </p>
                <div className="text-[11px] text-muted mt-2">
                  {d.hadith.source} · {t("hadith.no")} {d.hadith.number}
                </div>
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
