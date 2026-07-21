"use client";

import { useEffect, useRef, useState } from "react";
import { PageLoader } from "@/components/Brand";
import { useLang } from "@/components/LanguageProvider";
import { surahName, getBismillahDisplay, cleanAyah } from "@/lib/quranDisplay";
import type { SurahMeta } from "@/lib/types";

interface PageAyah {
  surahNumber: number;
  ayahNumber: number;
  text: string;
}
interface PageSurah {
  number: number;
  nameArabic: string;
  nameTranslit: string;
  firstPage: number;
  lastPage: number;
}
interface MushafPage {
  page: number;
  totalPages: number;
  ayahs: PageAyah[];
  surahs: PageSurah[];
}

const POS_KEY = "aqim-quran-page";

function toArabicDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

export default function QuranPage() {
  const { t, lang } = useLang();
  const [data, setData] = useState<MushafPage | null>(null);
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [page, setPage] = useState<number | null>(null);

  // Resume where the reader left off.
  useEffect(() => {
    let p = 1;
    try {
      p = Number(localStorage.getItem(POS_KEY)) || 1;
    } catch {}
    setPage(Math.min(604, Math.max(1, p)));
    fetch("/api/surahs")
      .then((r) => r.json())
      .then((d) => setSurahs(d.surahs ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (page == null) return;
    let alive = true;
    fetch(`/api/mushaf?page=${page}`)
      .then((r) => r.json())
      .then((d) => alive && setData(d))
      .catch(() => {});
    try {
      localStorage.setItem(POS_KEY, String(page));
    } catch {}
    window.scrollTo({ top: 0 });
    return () => {
      alive = false;
    };
  }, [page]);

  async function jumpToSurah(n: number) {
    const r = await fetch(`/api/mushaf?surah=${n}`);
    const d = await r.json();
    setPage(d.page ?? 1);
  }

  // Book-style page turning: swipe like flipping a Mushaf page. The next page
  // physically sits on the LEFT in an Arabic book — dragging it to the right
  // (positive delta) turns forward; the reverse turns back. Tapping a page
  // edge does the same.
  const touchX = useRef<number | null>(null);
  function turn(delta: 1 | -1) {
    setPage((p) => Math.min(604, Math.max(1, (p ?? 1) + delta)));
  }
  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 55) return;
    turn(dx > 0 ? 1 : -1);
  }

  if (page == null || !data) return <PageLoader />;

  // Progress within the page's main surah (the one that continues furthest).
  const main = data.surahs[data.surahs.length - 1];
  const span = main ? main.lastPage - main.firstPage + 1 : 1;
  const progress = main
    ? Math.min(1, Math.max(0, (data.page - main.firstPage + 1) / span))
    : 0;

  // Group the page's ayahs per surah for headers/bismillah.
  const groups: { surah: PageSurah; ayahs: PageAyah[] }[] = [];
  for (const a of data.ayahs) {
    const last = groups[groups.length - 1];
    if (last && last.surah.number === a.surahNumber) last.ayahs.push(a);
    else {
      const s = data.surahs.find((x) => x.number === a.surahNumber)!;
      groups.push({ surah: s, ayahs: [a] });
    }
  }

  return (
    <div className="pt-1 max-w-2xl mx-auto">
      {/* Reading progress for the current surah */}
      <div className="sticky top-[64px] z-10 -mx-4 px-4 py-2 bg-background">
        <div className="flex items-center justify-between text-[11px] text-muted mb-1">
          <span>
            {main &&
              `${t("passage.surah")} ${surahName(lang, main.nameArabic, main.nameTranslit)}`}
          </span>
          <span>{t("quran.progress")}</span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-secondary transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mt-3">
        <select
          value=""
          onChange={(e) => e.target.value && jumpToSurah(Number(e.target.value))}
          className="flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
        >
          <option value="">{t("quran.jump")}</option>
          {surahs.map((s) => (
            <option key={s.number} value={s.number}>
              {s.number}. {surahName(lang, s.nameArabic, s.nameTranslit)}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted whitespace-nowrap tabular-nums">
          {t("quran.page")} {lang === "ar" ? toArabicDigits(data.page) : data.page} /{" "}
          {lang === "ar" ? toArabicDigits(604) : 604}
        </span>
      </div>

      {/* The page — turned like a book: swipe, or tap the edges */}
      <div
        key={data.page}
        className="relative card mt-3 px-5 sm:px-8 py-7 animate-page select-none"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* edge tap zones (invisible): left = next (RTL book), right = back */}
        <button
          aria-label="next page"
          onClick={() => turn(1)}
          className="absolute inset-y-0 left-0 w-[14%] z-10 cursor-pointer opacity-0"
        />
        <button
          aria-label="previous page"
          onClick={() => turn(-1)}
          className="absolute inset-y-0 right-0 w-[14%] z-10 cursor-pointer opacity-0"
        />
        {groups.map((g) => {
          const startsAtOne = g.ayahs[0].ayahNumber === 1;
          const bism = getBismillahDisplay(
            g.surah.number,
            g.ayahs[0].ayahNumber,
            g.ayahs[0].text,
          );
          const renderAyahs = (
            bism.skipFirstAyah ? g.ayahs.slice(1) : g.ayahs
          ).map((a, idx) => ({
            n: a.ayahNumber,
            text:
              !bism.skipFirstAyah && idx === 0 && bism.firstAyahText != null
                ? bism.firstAyahText
                : cleanAyah(a.text),
          }));
          return (
            <div key={g.surah.number} className="mb-2">
              {startsAtOne && (
                <div className="text-center my-4">
                  <div className="inline-block rounded-xl border border-accent/40 bg-accent-soft/50 px-6 py-2 font-quran text-xl text-primary">
                    {g.surah.nameArabic}
                  </div>
                </div>
              )}
              {bism.line && (
                <p className="bismillah-line" dir="rtl">
                  {bism.line}
                  {bism.lineIsAyahOne && (
                    <span className="ayah-mark">﴿{toArabicDigits(1)}﴾</span>
                  )}
                </p>
              )}
              <p className="quran-text !text-justify" dir="rtl">
                {renderAyahs.map((a) => (
                  <span key={a.n}>
                    {a.text}
                    <span className="ayah-mark">﴿{toArabicDigits(a.n)}﴾</span>{" "}
                  </span>
                ))}
              </p>
            </div>
          );
        })}
      </div>

      {/* No buttons — the page turns like a book */}
      <p className="text-center text-[11px] text-muted mt-3 pb-6">
        {t("quran.swipeHint")}
      </p>
    </div>
  );
}
