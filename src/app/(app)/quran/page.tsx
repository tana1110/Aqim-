"use client";

import { useEffect, useRef, useState } from "react";
import { useSwipeable } from "react-swipeable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageLoader } from "@/components/Brand";
import { WirdStrip } from "@/components/WirdCard";
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
  juz: number;
  ayahs: PageAyah[];
  surahs: PageSurah[];
}

const POS_KEY = "aqim-quran-page";
const HINT_KEY = "aqim-quran-hint-seen";

function toArabicDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

export default function QuranPage() {
  const { t, lang } = useLang();
  const [data, setData] = useState<MushafPage | null>(null);
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [page, setPage] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const fetchSeq = useRef(0);

  // Resume exactly where the reader left off.
  useEffect(() => {
    let p = 1;
    try {
      p = Number(localStorage.getItem(POS_KEY)) || 1;
      setShowCoach(!localStorage.getItem(HINT_KEY));
    } catch {}
    setPage(Math.min(604, Math.max(1, p)));
    fetch("/api/surahs")
      .then((r) => r.json())
      .then((d) => setSurahs(d.surahs ?? []))
      .catch(() => {});
  }, []);

  function dismissCoach() {
    setShowCoach(false);
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {}
  }

  // Load the page's content; stale responses are discarded (fetchSeq) so fast
  // turning can never render the wrong page. A failed load shows a retry —
  // never an eternal spinner.
  const loadPage = (p: number) => {
    const seq = ++fetchSeq.current;
    setLoadError(false);
    fetch(`/api/mushaf?page=${p}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) => {
        if (seq === fetchSeq.current) setData(d);
      })
      .catch(() => {
        if (seq === fetchSeq.current) setLoadError(true);
      });
  };
  useEffect(() => {
    if (page == null) return;
    loadPage(page);
    try {
      localStorage.setItem(POS_KEY, String(page));
    } catch {}
    window.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function jumpToSurah(n: number) {
    const r = await fetch(`/api/mushaf?surah=${n}`);
    const d = await r.json();
    setPage(d.page ?? 1);
  }

  // EXACTLY one page per gesture (single gesture source — no overlapping tap
  // zones). The next page physically sits on the LEFT in an Arabic book:
  // swiping it toward the right turns forward.
  function turn(delta: 1 | -1) {
    if (showCoach) dismissCoach();
    setPage((p) => Math.min(604, Math.max(1, (p ?? 1) + delta)));
  }
  const swipe = useSwipeable({
    onSwipedRight: () => turn(1),
    onSwipedLeft: () => turn(-1),
    delta: 50,
    preventScrollOnSwipe: false,
    trackTouch: true,
    trackMouse: false,
  });

  if (page != null && loadError && !data) {
    return (
      <div className="card p-6 text-center mt-6 space-y-3">
        <p className="text-sm text-muted">{t("quran.loadFailed")}</p>
        <button
          onClick={() => loadPage(page)}
          className="btn-primary px-6 py-2 text-sm"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  if (page == null || !data) return <PageLoader />;

  // Progress within the page's main surah.
  const main = data.surahs[data.surahs.length - 1];
  const span = main ? main.lastPage - main.firstPage + 1 : 1;
  const progress = main
    ? Math.min(1, Math.max(0, (data.page - main.firstPage + 1) / span))
    : 0;

  // Group the page's ayahs per surah (headers/bismillah at real surah starts).
  const groups: { surah: PageSurah; ayahs: PageAyah[] }[] = [];
  for (const a of data.ayahs) {
    const last = groups[groups.length - 1];
    if (last && last.surah.number === a.surahNumber) last.ayahs.push(a);
    else {
      const s = data.surahs.find((x) => x.number === a.surahNumber)!;
      groups.push({ surah: s, ayahs: [a] });
    }
  }

  const digits = (n: number) => (lang === "ar" ? toArabicDigits(n) : String(n));

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

      {/* Daily wird lives with reading */}
      <div className="mt-3">
        <WirdStrip />
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
          {t("quran.page")} {digits(data.page)} / {digits(604)}
        </span>
      </div>

      {/* ONE page, framed like a printed Mushaf. Swipe to turn; side arrows
          serve desktop. */}
      <div className="relative mt-3">
        <button
          aria-label="next"
          onClick={() => turn(1)}
          disabled={data.page >= 604}
          className="hidden sm:grid place-items-center absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full card text-muted hover:text-foreground disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          aria-label="previous"
          onClick={() => turn(-1)}
          disabled={data.page <= 1}
          className="hidden sm:grid place-items-center absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full card text-muted hover:text-foreground disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>

        {/* First-visit coach mark — disappears after the first page turn */}
        {showCoach && (
          <button
            onClick={dismissCoach}
            className="absolute top-3 inset-x-0 z-20 mx-auto w-fit flex items-center gap-2 rounded-full bg-primary text-white px-4 py-2 text-xs font-bold shadow-lg animate-rise"
          >
            <ChevronRight size={13} className="animate-pulse" />
            {t("quran.coach")}
            <span className="text-white/60 ms-1">×</span>
          </button>
        )}

        {/* Edge tap zones (mobile): tap left edge = next page (Arabic book
            order), right edge = previous. One turn per tap. */}
        <button
          aria-hidden
          tabIndex={-1}
          onClick={() => turn(1)}
          className="sm:hidden absolute inset-y-0 left-0 w-[18%] z-10"
        />
        <button
          aria-hidden
          tabIndex={-1}
          onClick={() => turn(-1)}
          className="sm:hidden absolute inset-y-0 right-0 w-[18%] z-10"
        />

        <div {...swipe} key={data.page} className="animate-page select-none">
          <div className="rounded-lg border-2 border-accent/60 bg-surface p-1.5 shadow-sm">
            <div className="rounded-md border border-accent/35 px-4 sm:px-7 pt-3 pb-5">
              {/* Mushaf chrome: juz (start) · surah (end) */}
              <div className="flex items-center justify-between text-[11px] text-muted border-b border-accent/25 pb-2 mb-4">
                <span>
                  {t("setup.juz")} {digits(data.juz)}
                </span>
                <span className="text-sm font-bold text-primary">
                  {main
                    ? surahName(lang, main.nameArabic, main.nameTranslit)
                    : ""}
                </span>
              </div>

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
                  <div key={g.surah.number}>
                    {startsAtOne && (
                      <div className="my-3 rounded-lg border-y-2 border-x border-accent/50 bg-accent-soft/40 py-2.5 text-center">
                        <span className="font-quran text-xl text-primary">
                          {g.surah.nameArabic}
                        </span>
                      </div>
                    )}
                    {bism.line && (
                      <p className="bismillah-line !border-b-0 !mb-2" dir="rtl">
                        {bism.line}
                        {bism.lineIsAyahOne && (
                          <span className="ayah-mark">
                            {"۝" + toArabicDigits(1)}
                          </span>
                        )}
                      </p>
                    )}
                    <p
                      className="quran-text !text-justify !leading-[2.3]"
                      dir="rtl"
                    >
                      {renderAyahs.map((a) => (
                        <span key={a.n}>
                          {a.text}
                          <span className="ayah-mark text-accent">
                            {"۝" + toArabicDigits(a.n)}
                          </span>{" "}
                        </span>
                      ))}
                    </p>
                  </div>
                );
              })}

              {/* page number, centered like a printed Mushaf */}
              <div className="text-center mt-4 pt-2 border-t border-accent/25 text-sm text-muted tabular-nums">
                {digits(data.page)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pb-6" />
    </div>
  );
}
