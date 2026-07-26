"use client";

import { useEffect, useRef, useState } from "react";
import { useSwipeable } from "react-swipeable";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Play,
  Search,
  Square,
  X,
} from "lucide-react";
import { PageLoader } from "@/components/Brand";
import { useLang } from "@/components/LanguageProvider";
import { surahName, getBismillahDisplay, cleanAyah } from "@/lib/quranDisplay";
import { maybeCompleteSurahWird, recordPageRead } from "@/lib/wird";
import {
  ayahAudioUrl,
  downloadSurahAudio,
  globalAyahNumber,
  isSurahAudioDownloaded,
} from "@/lib/audio";
import type { SurahMeta } from "@/lib/types";

// Standard Madani-mushaf start page of each juz (1-30).
const JUZ_PAGES = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302,
  322, 342, 362, 382, 402, 422, 441, 462, 482, 502, 522, 542, 562, 582,
];

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

  // Resume exactly where the reader left off — unless another page handed
  // us a surah to open (e.g. the home review card).
  useEffect(() => {
    let p = 1;
    let jumpSurah: number | null = null;
    try {
      p = Number(localStorage.getItem(POS_KEY)) || 1;
      setShowCoach(!localStorage.getItem(HINT_KEY));
      jumpSurah = Number(sessionStorage.getItem("aqim-jump-surah")) || null;
      sessionStorage.removeItem("aqim-jump-surah");
    } catch {}
    if (jumpSurah) {
      jumpToSurah(jumpSurah).catch(() => setPage(Math.min(604, Math.max(1, p))));
    } else setPage(Math.min(604, Math.max(1, p)));
    fetch("/api/surahs")
      .then((r) => r.json())
      .then((d) => {
        const list = d.surahs ?? [];
        setSurahs(list);
        // Re-check with real page spans (first page view may have preceded them).
        if (maybeCompleteSurahWird(list)) {
          setWirdToast(true);
          setTimeout(() => setWirdToast(false), 5000);
        }
      })
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
  const [wirdToast, setWirdToast] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  // ---- Recitation playback (real recorded audio; plays page by page) ----
  const [playing, setPlaying] = useState<{ s: number; a: number } | null>(null);
  const [dl, setDl] = useState<"idle" | "busy" | "done">("idle");
  const [dlDone, setDlDone] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const continueRef = useRef(false);
  const dataRef = useRef<MushafPage | null>(null);
  const surahsRef = useRef<SurahMeta[]>([]);
  dataRef.current = data;
  surahsRef.current = surahs;

  const stopAudio = () => {
    continueRef.current = false;
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(null);
  };

  const playFrom = (idx: number) => {
    const d = dataRef.current;
    const list = d?.ayahs ?? [];
    if (!d || surahsRef.current.length === 0) return;
    if (idx >= list.length) {
      if (d.page < 604) {
        continueRef.current = true; // keep reciting onto the next page
        setPage(d.page + 1);
      } else stopAudio();
      return;
    }
    const a = list[idx];
    const g = globalAyahNumber(surahsRef.current, a.surahNumber, a.ayahNumber);
    if (g == null) {
      stopAudio();
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(ayahAudioUrl(g));
    audioRef.current = audio;
    setPlaying({ s: a.surahNumber, a: a.ayahNumber });
    audio.onended = () => playFrom(idx + 1);
    audio.onerror = () => stopAudio();
    audio.play().catch(() => stopAudio());
  };

  // When the next page's content arrives mid-recitation, keep going;
  // a manual page turn stops playback instead.
  useEffect(() => {
    if (!data) return;
    if (continueRef.current) {
      continueRef.current = false;
      playFrom(0);
    } else if (audioRef.current) {
      stopAudio();
    }
    // check the download state of this page's main surah
    const m = data.surahs[data.surahs.length - 1];
    if (m && surahs.length > 0) {
      isSurahAudioDownloaded(surahs, m.number)
        .then((ok) => {
          setDl(ok ? "done" : "idle");
        })
        .catch(() => setDl("idle"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, surahs]);

  useEffect(() => () => stopAudio(), []); // never leak audio on unmount

  async function downloadCurrentSurah() {
    const m = dataRef.current?.surahs[dataRef.current.surahs.length - 1];
    if (!m || dl === "busy") return;
    setDl("busy");
    setDlDone(0);
    try {
      await downloadSurahAudio(surahsRef.current, m.number, (done) =>
        setDlDone(done),
      );
      setDl("done");
    } catch {
      setDl("idle");
    }
  }
  useEffect(() => {
    if (page == null) return;
    loadPage(page);
    try {
      localStorage.setItem(POS_KEY, String(page));
    } catch {}
    // Reading here counts toward the wird automatically — pages mode by
    // count, surah mode by finishing every page of the chosen surahs.
    const donePages = recordPageRead(page);
    const doneSurahs = maybeCompleteSurahWird(surahs);
    if (donePages || doneSurahs) {
      setWirdToast(true);
      setTimeout(() => setWirdToast(false), 5000);
    }
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
      const s = data.surahs.find((x) => x.number === a.surahNumber);
      if (!s) continue; // never crash the page on a data mismatch
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

      {/* One position button — opens the full navigator (surah/juz/page) */}
      <button
        onClick={() => setNavOpen(true)}
        className="w-full mt-3 card rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-sm active:scale-[0.99] transition"
      >
        <span className="font-bold text-primary truncate">
          {main ? surahName(lang, main.nameArabic, main.nameTranslit) : ""}
        </span>
        <span className="flex items-center gap-2 text-xs text-muted whitespace-nowrap tabular-nums">
          {t("quran.page")} {digits(data.page)} / {digits(604)}
          <Search size={14} />
        </span>
      </button>

      {/* Recitation: listen to this page (continues page after page),
          download the surah for offline listening */}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={playing ? stopAudio : () => playFrom(0)}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
            playing ? "bg-accent text-white" : "btn-primary !rounded-full"
          }`}
        >
          {playing ? <Square size={13} /> : <Play size={13} />}
          {playing ? t("quran.stop") : t("quran.listen")}
        </button>
        <span className="flex-1 text-[11px] text-muted truncate">
          {t("quran.reciter")}
        </span>
        <button
          onClick={downloadCurrentSurah}
          disabled={dl !== "idle"}
          aria-label={t("settings.offlineBtn")}
          className={`w-9 h-9 rounded-full grid place-items-center border transition ${
            dl === "done"
              ? "border-secondary/50 bg-secondary-soft text-secondary"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          {dl === "done" ? (
            <Check size={15} strokeWidth={3} />
          ) : dl === "busy" ? (
            <span className="text-[9px] font-bold tabular-nums">{dlDone}</span>
          ) : (
            <Download size={15} />
          )}
        </button>
      </div>

      {navOpen && (
        <MushafNavigator
          surahs={surahs}
          currentSurah={main?.number ?? null}
          onClose={() => setNavOpen(false)}
          onSurah={(n) => {
            setNavOpen(false);
            jumpToSurah(n);
          }}
          onPage={(p) => {
            setNavOpen(false);
            setPage(Math.min(604, Math.max(1, p)));
          }}
        />
      )}

      {/* Wird completed by reading — quiet confirmation */}
      {wirdToast && (
        <div className="fixed inset-x-0 top-[72px] z-30 px-4 animate-rise">
          <div className="mx-auto w-fit flex items-center gap-2 rounded-full bg-secondary text-white px-5 py-2.5 text-sm font-bold shadow-lg">
            <Check size={16} strokeWidth={3} />
            {t("wird.autoDone")}
          </div>
        </div>
      )}

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
                        <span
                          key={a.n}
                          className={
                            playing?.s === g.surah.number && playing?.a === a.n
                              ? "bg-accent-soft rounded-sm"
                              : undefined
                          }
                        >
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

// Bottom-sheet navigator: jump by surah (searchable), juz, or page number.
function MushafNavigator({
  surahs,
  currentSurah,
  onClose,
  onSurah,
  onPage,
}: {
  surahs: SurahMeta[];
  currentSurah: number | null;
  onClose: () => void;
  onSurah: (n: number) => void;
  onPage: (p: number) => void;
}) {
  const { t, lang } = useLang();
  const [tab, setTab] = useState<"surah" | "juz" | "page">("surah");
  const [q, setQ] = useState("");
  const [pageInput, setPageInput] = useState("");

  const strip = (s: string) => s.normalize("NFC").replace(/\p{M}/gu, "");
  const list = surahs.filter((s) => {
    const query = strip(q.trim().toLowerCase());
    if (!query) return true;
    return (
      strip(s.nameArabic).includes(query) ||
      s.nameTranslit.toLowerCase().includes(query) ||
      s.nameEnglish.toLowerCase().includes(query) ||
      String(s.number) === query
    );
  });

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="absolute inset-x-0 bottom-0 max-h-[80dvh] bg-surface rounded-t-3xl shadow-lg flex flex-col animate-rise">
        <div className="flex items-center justify-between p-4 pb-2">
          <span className="text-sm font-bold">{t("quran.navTitle")}</span>
          <button
            onClick={onClose}
            aria-label="close"
            className="w-9 h-9 grid place-items-center rounded-lg text-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 px-4 pb-3">
          {(["surah", "juz", "page"] as const).map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`flex-1 rounded-xl py-2 text-sm font-bold transition ${
                tab === tb
                  ? "bg-primary text-white"
                  : "bg-surface-2 text-muted"
              }`}
            >
              {t(`quran.tab.${tb}`)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {tab === "surah" && (
            <>
              <div className="relative mb-2">
                <Search
                  size={15}
                  className="absolute start-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("setup.search")}
                  className="w-full rounded-xl border border-border bg-surface ps-9 pe-3 py-2.5 text-sm"
                />
              </div>
              <div className="divide-y divide-border">
                {list.map((s) => (
                  <button
                    key={s.number}
                    onClick={() => onSurah(s.number)}
                    className={`w-full flex items-center justify-between gap-3 py-3 text-start min-h-12 ${
                      s.number === currentSurah ? "text-primary font-bold" : ""
                    }`}
                  >
                    <span className="text-sm">
                      {s.number}. {surahName(lang, s.nameArabic, s.nameTranslit)}
                    </span>
                    {s.number === currentSurah && <Check size={15} />}
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === "juz" && (
            <div className="grid grid-cols-5 gap-2">
              {JUZ_PAGES.map((p, i) => (
                <button
                  key={i}
                  onClick={() => onPage(p)}
                  className="aspect-square rounded-xl border border-border bg-surface grid place-items-center text-sm font-bold hover:border-primary/40 active:scale-[0.95] transition"
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}

          {tab === "page" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const p = Number(pageInput);
                if (p >= 1 && p <= 604) onPage(p);
              }}
              className="flex items-center gap-2 pt-2"
            >
              <input
                type="number"
                min={1}
                max={604}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                placeholder="1 – 604"
                className="flex-1 rounded-xl border border-border bg-surface px-3 py-3 text-sm tabular-nums"
              />
              <button type="submit" className="btn-primary px-6 py-3 text-sm">
                {t("quran.go")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
