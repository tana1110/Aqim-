"use client";

import { useEffect, useRef, useState } from "react";
import { useSwipeable } from "react-swipeable";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Menu,
  Play,
  Search,
  Square,
  X,
} from "lucide-react";
import { PageLoader } from "@/components/Brand";
import { useLang } from "@/components/LanguageProvider";
import { surahName, getBismillahDisplay, cleanAyah } from "@/lib/quranDisplay";
import { enterImmersive, exitImmersive } from "@/lib/nativeBridge";
import {
  isDoneToday,
  loadWird,
  maybeCompleteSurahWird,
  nextWirdPage,
  recordPageRead,
} from "@/lib/wird";
import { pageCountsToday, postStreak } from "@/lib/streak";
import { markKhatmaPage } from "@/lib/khatma";
import {
  RECITERS,
  ayahAudioUrl,
  downloadSurahAudio,
  globalAyahNumber,
  isSurahAudioDownloaded,
  loadReciter,
  saveReciter,
  type Reciter,
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

// The printed-mushaf surah cartouche: double gold rules stretching the full
// width, a floral medallion at each end, and the surah name in a central
// plaque. Pure SVG + theme tokens; sizes in em so it scales with the page.
function Rosette({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <g fill="currentColor">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <path
            key={a}
            d="M20 6 C23.5 11,23.5 15,20 17.5 C16.5 15,16.5 11,20 6 Z"
            transform={`rotate(${a} 20 20)`}
            opacity="0.9"
          />
        ))}
      </g>
      <circle
        cx="20"
        cy="20"
        r="4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="20" cy="20" r="1.6" fill="currentColor" />
    </svg>
  );
}

function SurahBanner({ name, bare = false }: { name: string; bare?: boolean }) {
  return (
    <div
      className={`surah-banner ${bare ? "surah-banner--bare" : ""}`}
      dir="rtl"
      aria-label={name}
    >
      <svg
        viewBox="0 0 400 56"
        preserveAspectRatio="none"
        className="surah-banner__band"
        aria-hidden
      >
        <g fill="none" stroke="currentColor">
          <rect x="2" y="4" width="396" height="48" rx="9" strokeWidth="2" />
          <rect
            x="7"
            y="9"
            width="386"
            height="38"
            rx="6"
            strokeWidth="0.8"
            opacity="0.75"
          />
        </g>
      </svg>
      <Rosette className="surah-banner__end surah-banner__end--start" />
      <Rosette className="surah-banner__end surah-banner__end--end" />
      <span className="surah-banner__name">{name}</span>
    </div>
  );
}

export default function QuranPage() {
  const { t, lang } = useLang();
  const [data, setData] = useState<MushafPage | null>(null);
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [page, setPage] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const fetchSeq = useRef(0);
  // Set by turn() below; read once by the render that remounts the reading
  // pane with the matching page-turn flip class, then cleared (see the
  // effect near jumpToSurah for why that has to happen on data.page, not
  // on the `page` state itself).
  const turnDirRef = useRef<1 | -1 | null>(null);

  // Resume exactly where the reader left off — unless another page handed
  // us a position (wird tile, review card). The handoff keys are consumed
  // once behind a ref (StrictMode double-invokes effects) and expire fast
  // (a stale key must never hijack a later visit).
  const consumedJump = useRef(false);
  const wantsWirdJump = useRef(false);
  useEffect(() => {
    if (consumedJump.current) return;
    consumedJump.current = true;
    let p = 1;
    let jumpSurah: number | null = null;
    let jumpPage: number | null = null;
    try {
      p = Number(localStorage.getItem(POS_KEY)) || 1;
      setShowCoach(!localStorage.getItem(HINT_KEY));
      jumpSurah = Number(sessionStorage.getItem("aqim-jump-surah")) || null;
      sessionStorage.removeItem("aqim-jump-surah");
      const rawJump = sessionStorage.getItem("aqim-jump-page");
      sessionStorage.removeItem("aqim-jump-page");
      if (rawJump) {
        const parsed = JSON.parse(rawJump) as { page?: number; ts?: number };
        if (
          parsed?.page &&
          (!parsed.ts || Date.now() - parsed.ts < 20_000)
        ) {
          jumpPage = parsed.page;
        }
      }
      wantsWirdJump.current =
        sessionStorage.getItem("aqim-jump-wird") === "1";
      sessionStorage.removeItem("aqim-jump-wird");
    } catch {}
    if (jumpPage) {
      wantsWirdJump.current = false;
      setPage(Math.min(604, Math.max(1, jumpPage)));
    } else if (jumpSurah) {
      wantsWirdJump.current = false;
      jumpToSurah(jumpSurah).catch(() => setPage(Math.min(604, Math.max(1, p))));
    } else setPage(Math.min(604, Math.max(1, p)));
    fetch("/api/surahs")
      .then((r) => r.json())
      .then((d) => {
        const list = d.surahs ?? [];
        setSurahs(list);
        // The wird tile may have been tapped before spans existed — finish
        // the jump here with real page data.
        if (wantsWirdJump.current) {
          wantsWirdJump.current = false;
          const target = nextWirdPage(list);
          if (target) setPage(Math.min(604, Math.max(1, target)));
        }
        // Re-check with real page spans (first page view may have preceded them).
        if (maybeCompleteSurahWird(list)) {
          postStreak(); // the wird just completed — the day is saved
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

  // On phones the Quran IS the page: a full-bleed, continuously scrollable
  // reader (icon rail down the side, flowing text) — reading is fullscreen
  // (status bar hidden) the whole time, no tap-to-reveal chrome to manage
  // in PORTRAIT, where there's plenty of height for a persistent header.
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 768) return;
    // The native bridge (unlike the browser Fullscreen API) needs no user
    // gesture, so go immersive immediately rather than waiting for a tap.
    enterImmersive();
    // any touch while reading (page turns, first open) keeps it immersive
    const onTap = () => enterImmersive();
    window.addEventListener("pointerup", onTap);
    return () => {
      window.removeEventListener("pointerup", onTap);
      exitImmersive();
    };
  }, []);

  // LANDSCAPE is short on height (unlike portrait), so the surah/progress/
  // listen header there is tap-to-reveal instead of always on screen — it
  // starts hidden on entering landscape, opens on tap (as an overlay, not
  // pushing the text down), and auto-hides again after 2s idle, same
  // pattern the old full-chrome toggle used. Rotating back to portrait
  // always shows it again — that's the "normal" persistent header.
  const [mobileLandscape, setMobileLandscape] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => {
      const isDesktopViewport =
        window.innerWidth >= 768 && window.innerHeight >= 600;
      setMobileLandscape(
        !isDesktopViewport && window.innerWidth > window.innerHeight,
      );
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Reset on every orientation flip, computed during render rather than in
  // an effect (React's own recipe for "adjust state when a prop/derived
  // value changes" without an extra render pass).
  const [headerOpen, setHeaderOpen] = useState(true);
  const [prevMobileLandscape, setPrevMobileLandscape] = useState(mobileLandscape);
  if (mobileLandscape !== prevMobileLandscape) {
    setPrevMobileLandscape(mobileLandscape);
    setHeaderOpen(!mobileLandscape);
  }

  useEffect(() => {
    if (!mobileLandscape || !headerOpen) return;
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setHeaderOpen(false), 2000);
    };
    arm();
    const events = ["pointerdown", "pointerup", "scroll", "keydown"];
    for (const ev of events) window.addEventListener(ev, arm);
    return () => {
      clearTimeout(timer);
      for (const ev of events) window.removeEventListener(ev, arm);
    };
  }, [mobileLandscape, headerOpen]);

  useEffect(() => {
    const bg =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--color-background")
        .trim() || "#f3eee3";
    const metas = Array.from(
      document.head.querySelectorAll<HTMLMetaElement>(
        'meta[name="theme-color"]',
      ),
    );
    if (metas.length === 0) {
      const m = document.createElement("meta");
      m.name = "theme-color";
      document.head.appendChild(m);
      metas.push(m);
    }
    const prev = metas.map((m) => m.getAttribute("content"));
    for (const m of metas) m.setAttribute("content", bg);
    return () => {
      metas.forEach((m, i) => {
        const p = prev[i];
        if (p != null) m.setAttribute("content", p);
      });
    };
  }, []);

  // ---- Recitation playback (real recorded audio; plays page by page) ----
  // ONE reusable <audio> element: creating a fresh element per ayah breaks
  // the user-gesture chain on iOS and playback silently never starts.
  const [playing, setPlaying] = useState<{ s: number; a: number } | null>(null);
  const [reciter, setReciter] = useState<Reciter>(RECITERS[0]);
  const [dl, setDl] = useState<"idle" | "busy" | "done">("idle");
  const [dlDone, setDlDone] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const continueRef = useRef(false);
  const dataRef = useRef<MushafPage | null>(null);
  const surahsRef = useRef<SurahMeta[]>([]);
  const reciterRef = useRef<Reciter>(RECITERS[0]);
  dataRef.current = data;
  surahsRef.current = surahs;
  reciterRef.current = reciter;

  useEffect(() => {
    setReciter(loadReciter());
  }, []);

  const stopAudio = () => {
    continueRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
    }
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
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.src = ayahAudioUrl(g, reciterRef.current);
    setPlaying({ s: a.surahNumber, a: a.ayahNumber });
    audio.onended = () => playFrom(idx + 1);
    audio.onerror = () => stopAudio();
    audio.play().catch(() => stopAudio());

    // Prefetch the NEXT ayah's audio into the cache while this one plays —
    // without this, each ayah only starts downloading after the previous
    // one ends, and that network round-trip is exactly the audible pause
    // between ayahs the reciter shouldn't have.
    const next = list[idx + 1];
    if (next) {
      const gNext = globalAyahNumber(
        surahsRef.current,
        next.surahNumber,
        next.ayahNumber,
      );
      if (gNext != null) {
        const nextUrl = ayahAudioUrl(gNext, reciterRef.current);
        caches
          .open("aqim-audio-v1")
          .then(async (cache) => {
            if (await cache.match(nextUrl)) return;
            const res = await fetch(nextUrl, { mode: "no-cors" });
            await cache.put(nextUrl, res);
          })
          .catch(() => {});
      }
    }
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
    // check the download state of this page's main surah (per reciter)
    const m = data.surahs[data.surahs.length - 1];
    if (m && surahs.length > 0) {
      isSurahAudioDownloaded(surahs, m.number, reciter)
        .then((ok) => {
          setDl(ok ? "done" : "idle");
        })
        .catch(() => setDl("idle"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, surahs, reciter]);

  useEffect(() => () => stopAudio(), []); // never leak audio on unmount

  async function downloadCurrentSurah() {
    const m = dataRef.current?.surahs[dataRef.current.surahs.length - 1];
    if (!m || dl === "busy") return;
    setDl("busy");
    setDlDone(0);
    try {
      await downloadSurahAudio(surahsRef.current, m.number, reciterRef.current, (done) =>
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
    markKhatmaPage(page);
    const doneSurahs = maybeCompleteSurahWird(surahs);
    // Daily streak (server-side truth): the wird saves the day; without a
    // wird any page does; a wird still owed gets the 23:00–01:00 mercy.
    if (pageCountsToday(loadWird().enabled, isDoneToday())) postStreak();
    if (donePages || doneSurahs) {
      setWirdToast(true);
      setTimeout(() => setWirdToast(false), 5000);
    }
    window.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // The page-turn flip class is read once, by the render that remounts the
  // reading pane — which is keyed on data.page (the fetched content), not
  // on the `page` state above: `page` updates the instant turn() is called,
  // but the pane doesn't actually swap to the new content (or its key)
  // until the fetch that effect kicked off resolves. Clearing the ref THERE
  // instead of up in that effect matters: clearing it on the `page` effect
  // (which runs synchronously, well before the fetch's async .then()) would
  // null it out before the remount that's supposed to read it ever
  // happens, so it would always land on the plain fade instead.
  useEffect(() => {
    turnDirRef.current = null;
  }, [data?.page]);

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
    turnDirRef.current = delta;
    setPage((p) => Math.min(604, Math.max(1, (p ?? 1) + delta)));
  }
  const turnAnim =
    turnDirRef.current === 1
      ? "animate-page-turn-next"
      : turnDirRef.current === -1
        ? "animate-page-turn-prev"
        : "animate-page";
  const swipe = useSwipeable({
    onSwipedRight: () => turn(1),
    onSwipedLeft: () => turn(-1),
    delta: 50,
    preventScrollOnSwipe: false,
    trackTouch: true,
    trackMouse: false,
  });
  // The full-page overlay needs its OWN handler instance — sharing one set
  // of swipe props between two mounted elements detaches the first.
  const swipeFull = useSwipeable({
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

  // The page's text content. bare = full-page mode: NOTHING but the Quran —
  // no ornament boxes, no borders.
  const renderGroups = (bare: boolean) =>
    groups.map((g) => {
      const startsAtOne = g.ayahs[0].ayahNumber === 1;
      const bism = getBismillahDisplay(
        g.surah.number,
        g.ayahs[0].ayahNumber,
        g.ayahs[0].text,
      );
      const renderAyahs = (bism.skipFirstAyah ? g.ayahs.slice(1) : g.ayahs).map(
        (a, idx) => ({
          n: a.ayahNumber,
          text:
            !bism.skipFirstAyah && idx === 0 && bism.firstAyahText != null
              ? bism.firstAyahText
              : cleanAyah(a.text),
        }),
      );
      return (
        <div key={g.surah.number}>
          {startsAtOne && (
            <SurahBanner name={g.surah.nameArabic} bare={bare} />
          )}
          {bism.line && (
            <p className="bismillah-line !border-b-0 !mb-2" dir="rtl">
              {bism.line}
              {bism.lineIsAyahOne && (
                <span className="ayah-mark">{"۝" + toArabicDigits(1)}</span>
              )}
            </p>
          )}
          <p className="quran-text !text-justify !leading-[2.3]" dir="rtl">
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
    });

  // The framed Mushaf page — shared by the normal view and full-page mode.
  const pageInner = (
    <div className="rounded-lg border-2 border-accent/60 bg-surface p-1.5 shadow-sm">
      <div className="rounded-md border border-accent/35 px-4 sm:px-7 pt-3 pb-5">
        {/* Mushaf chrome: juz (start) · surah (end) */}
        <div className="flex items-center justify-between text-[11px] text-muted border-b border-accent/25 pb-2 mb-4">
          <span>
            {t("setup.juz")} {digits(data.juz)}
          </span>
          <span className="text-sm font-bold text-primary">
            {main ? surahName(lang, main.nameArabic, main.nameTranslit) : ""}
          </span>
        </div>

        {renderGroups(false)}

        {/* page number, centered like a printed Mushaf */}
        <div className="text-center mt-4 pt-2 border-t border-accent/25 text-sm text-muted tabular-nums">
          {digits(data.page)}
        </div>
      </div>
    </div>
  );

  // Listen + reciter + download — shared by desktop layout and mobile chrome.
  const controlsRow = (
    <div className="flex items-center gap-2">
        <button
          onClick={playing ? stopAudio : () => playFrom(0)}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
            playing ? "bg-accent text-white" : "btn-primary !rounded-full"
          }`}
        >
          {playing ? <Square size={13} /> : <Play size={13} />}
          {playing ? t("quran.stop") : t("quran.listen")}
        </button>
        {/* Choose the reciter — playback and downloads follow the choice */}
        <select
          value={reciter.key}
          onChange={(e) => {
            const r = RECITERS.find((x) => x.key === e.target.value);
            if (!r) return;
            stopAudio();
            setReciter(r);
            saveReciter(r.key);
          }}
          className="flex-1 min-w-0 rounded-xl border border-border bg-surface px-2 py-1.5 text-[11px] text-muted"
        >
          {RECITERS.map((r) => (
            <option key={r.key} value={r.key}>
              {lang === "ar" ? r.ar : r.en}
            </option>
          ))}
        </select>
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
  );

  // Mobile reading header: surah name, juz/page, progress, listen controls.
  // Sticky (in-flow) in portrait, an overlay (absolutely positioned) in
  // landscape — same content either way.
  const readerHeader = (
    <div
      className="bg-background/95 backdrop-blur border-b border-border px-4 pb-2.5 space-y-2"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-primary truncate">
          {main ? surahName(lang, main.nameArabic, main.nameTranslit) : ""}
        </span>
        <span className="shrink-0 text-xs text-muted tabular-nums">
          {t("setup.juz")} {digits(data.juz)} · {t("quran.page")} {digits(data.page)} / {digits(604)}
        </span>
      </div>
      <div className="h-1 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-secondary transition-all duration-300"
          style={{ width: (progress * 100) + "%" }}
        />
      </div>
      {controlsRow}
    </div>
  );

  return (
    <>
      {/* MOBILE: a continuous, scrollable reader — a slim icon rail down
          the side for navigation, the verified Quran text flowing and
          wrapping normally (never squeezed to fit one screen, never
          absolutely positioned) so it simply scrolls in any orientation. */}
      <div
        dir="ltr"
        className="desktop:hidden fixed inset-0 z-30 bg-background flex overflow-hidden"
      >
        {/* icon rail */}
        <div
          className="shrink-0 w-14 flex flex-col items-center gap-1 overflow-y-auto no-scrollbar bg-surface border-e border-border py-2"
          style={{
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
          }}
        >
          <button
            aria-label="menu"
            onClick={() => window.dispatchEvent(new Event("aqim-open-nav"))}
            className="w-10 h-10 shrink-0 grid place-items-center rounded-full text-muted hover:text-foreground hover:bg-surface-2 transition"
          >
            <Menu size={19} />
          </button>
          <button
            aria-label="navigator"
            onClick={() => setNavOpen(true)}
            className="w-10 h-10 shrink-0 grid place-items-center rounded-full text-muted hover:text-foreground hover:bg-surface-2 transition"
          >
            <Search size={17} />
          </button>
          <div className="flex-1 min-h-2" />
          <button
            aria-label="previous"
            onClick={() => turn(-1)}
            disabled={data.page <= 1}
            className="w-10 h-10 shrink-0 grid place-items-center rounded-full text-muted hover:text-foreground hover:bg-surface-2 transition disabled:opacity-30"
          >
            <ChevronUp size={19} />
          </button>
          <button
            aria-label="next"
            onClick={() => turn(1)}
            disabled={data.page >= 604}
            className="w-10 h-10 shrink-0 grid place-items-center rounded-full text-muted hover:text-foreground hover:bg-surface-2 transition disabled:opacity-30"
          >
            <ChevronDown size={19} />
          </button>
          <span className="mt-1 shrink-0 text-[11px] font-bold text-accent tabular-nums">
            {digits(data.page)}
          </span>
        </div>

        {/* reading pane */}
        <div className="relative flex-1 min-w-0 h-full overflow-hidden">
          {/* LANDSCAPE: the header overlays on top instead of taking
              permanent space — there isn't much height to spare, and
              hiding it by default is what makes the page actually feel
              full-screen there. PORTRAIT: plenty of height, so it just
              stays put (sticky, scrolls away with the rest, no tap
              needed) — rendered inside the scroll container below instead. */}
          {mobileLandscape && headerOpen && (
            <div className="absolute top-0 inset-x-0 z-20 animate-rise">
              {readerHeader}
            </div>
          )}

          {/* Keyed on the page number so a turn remounts this wrapper fresh
              — that's what makes the CSS animation on it replay every
              turn. It only wraps (doesn't itself scroll), so the flip
              transform can't interfere with the sticky header or the
              scrolling inside the pane it contains. */}
          <div key={"m-" + data.page} className={`h-full ${turnAnim}`}>
            <div
              {...swipeFull}
              onClick={() => {
                if (!mobileLandscape) return;
                setHeaderOpen((o) => !o);
                enterImmersive(); // this tap is a real gesture — a good moment to retry fullscreen
              }}
              className="h-full overflow-y-auto overflow-x-hidden select-none no-scrollbar"
            >
              {!mobileLandscape && (
                <div className="sticky top-0 z-10">{readerHeader}</div>
              )}

              <div className="px-4 pb-10 pt-3">{renderGroups(true)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* DESKTOP: the framed reading layout */}
      <div className="hidden desktop:block pt-1 max-w-2xl mx-auto">
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
        className="w-full mt-3 card px-4 py-3 flex items-center justify-between gap-3 text-sm active:scale-[0.99] transition"
      >
        <span className="font-bold text-primary truncate">
          {main ? surahName(lang, main.nameArabic, main.nameTranslit) : ""}
        </span>
        <span className="flex items-center gap-2 text-xs text-muted whitespace-nowrap tabular-nums">
          {t("quran.page")} {digits(data.page)} / {digits(604)}
          <Search size={14} />
        </span>
      </button>

      <div className="mt-2">{controlsRow}</div>


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
            <X size={12} className="text-white/60 ms-1" />
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

        <div {...swipe} key={data.page} className={`${turnAnim} select-none`}>
          {pageInner}
        </div>
      </div>

      <div className="pb-6" />

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
    </>
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
  const [tab, setTab] = useState<"surah" | "juz" | "page" | "find">("surah");
  const [q, setQ] = useState("");
  const [pageInput, setPageInput] = useState("");
  const [findQ, setFindQ] = useState("");
  const [findBusy, setFindBusy] = useState(false);
  const [findRes, setFindRes] = useState<
    {
      surah: number;
      nameArabic: string;
      nameTranslit: string;
      ayah: number;
      page: number;
      text: string;
    }[] | null
  >(null);

  // Debounced verified-text search (pure text match, server-side).
  useEffect(() => {
    if (tab !== "find") return;
    const q = findQ.trim();
    if (q.length < 2) {
      setFindRes(null);
      return;
    }
    setFindBusy(true);
    const id = setTimeout(() => {
      fetch(`/api/quran-search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setFindRes(d.results ?? []))
        .catch(() => setFindRes([]))
        .finally(() => setFindBusy(false));
    }, 350);
    return () => clearTimeout(id);
  }, [findQ, tab]);

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
          {(["surah", "juz", "page", "find"] as const).map((tb) => (
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

          {tab === "find" && (
            <>
              <input
                type="search"
                value={findQ}
                onChange={(e) => setFindQ(e.target.value)}
                placeholder={t("quran.findPh")}
                dir="rtl"
                autoFocus
                className={`w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm mb-2 ${findBusy ? "animate-pulse" : ""}`}
              />
              {findRes && findRes.length === 0 && !findBusy && (
                <p className="text-sm text-muted text-center py-6">
                  {t("quran.findEmpty")}
                </p>
              )}
              <div className="divide-y divide-border">
                {(findRes ?? []).map((r) => (
                  <button
                    key={`${r.surah}:${r.ayah}`}
                    onClick={() => onPage(r.page)}
                    className="w-full py-3 text-start min-h-12"
                  >
                    <span className="block font-quran text-[15px] leading-relaxed line-clamp-2" dir="rtl">
                      {r.text}
                    </span>
                    <span className="block text-[11px] text-muted mt-1">
                      {surahName(lang, r.nameArabic, r.nameTranslit)} · {r.ayah}
                    </span>
                  </button>
                ))}
              </div>
            </>
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
