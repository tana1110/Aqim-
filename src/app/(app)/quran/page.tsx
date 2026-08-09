"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { BottomTabs } from "@/components/BottomNav";
import { useLang } from "@/components/LanguageProvider";
import { surahName, getBismillahDisplay, cleanAyah } from "@/lib/quranDisplay";
import {
  isDoneToday,
  loadWird,
  maybeCompleteSurahWird,
  nextWirdPage,
  recordPageRead,
} from "@/lib/wird";
import { pageCountsToday, postStreak } from "@/lib/streak";
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

  // On phones the Quran IS the page: one full-bleed fitted mushaf page.
  // Tapping the middle toggles the app chrome (bars, controls, nav).
  const [chrome, setChrome] = useState(false);

  // Immersive reading, tied to the chrome: reading = fullscreen (status
  // bar hidden); tapping the middle opens the bars AND exits fullscreen
  // (the "normal screen"); after 2s without touching, the chrome closes
  // and fullscreen returns on its own. Re-entry rides the transient
  // user-activation window (~5s after the last touch), so the 2s timer
  // still counts as gesture-driven for the browser.
  const chromeRef = useRef(chrome);
  chromeRef.current = chrome;
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 768) return;
    const enterFs = () => {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        el.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
      }
    };
    // any touch while reading (page turns, first open) keeps it immersive
    const onTap = () => {
      if (!chromeRef.current) enterFs();
    };
    window.addEventListener("pointerup", onTap);
    return () => {
      window.removeEventListener("pointerup", onTap);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // The bars overlay WITHIN fullscreen — never exit/re-enter for them.
  // Android shows its "to exit full screen" toast on every entry, so the
  // only way to see it once per visit is to stay in fullscreen the whole
  // time. Tap: bars appear on top; 2s idle: they slide away again.
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 768) return;
    if (!chrome) return;
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setChrome(false), 2000);
    };
    arm();
    const events = ["pointerdown", "pointerup", "scroll", "keydown"];
    for (const ev of events) window.addEventListener(ev, arm);
    return () => {
      clearTimeout(timer);
      for (const ev of events) window.removeEventListener(ev, arm);
    };
  }, [chrome]);

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

  // ---- EXACT Madani layout (QCF V2: the King Fahd Complex per-page fonts
  // and real 15-line word placement). Falls back to the Amiri renderer when
  // layout data or the page font can't load. ----
  interface ExactWord {
    c: string;
    s: number;
    a: number;
    e?: number; // 1 = ayah-end medallion
  }
  interface ExactPageData {
    page: number;
    lines: Record<number, ExactWord[]>;
    starts: { surah: number; firstLine: number }[];
  }
  const [exact, setExact] = useState<ExactPageData | null>(null);
  const loadedFonts = useRef<Set<number>>(new Set());

  async function ensurePageFont(p: number): Promise<void> {
    if (loadedFonts.current.has(p)) return;
    const family = `QCFP${p}`;
    const face = new FontFace(family, `url(/api/qcf-font/${p})`, {
      display: "block",
    });
    await face.load();
    document.fonts.add(face);
    loadedFonts.current.add(p);
  }

  // No flash on page turns: the CURRENT exact page keeps showing until the
  // next page's layout AND font are both ready, then they swap atomically.
  useEffect(() => {
    if (page == null) return;
    let alive = true;
    (async () => {
      try {
        const [res] = await Promise.all([
          fetch(`/api/mushaf-exact?page=${page}&v=2`),
          ensurePageFont(page),
        ]);
        if (!res.ok) throw new Error(String(res.status));
        const d = (await res.json()) as ExactPageData;
        if (!alive || d.page !== page) return;
        exactIter.current = 0; // re-solve, starting from the previous size
        setExact(d);
        // warm the next page for a seamless turn
        if (page < 604) {
          fetch(`/api/mushaf-exact?page=${page + 1}&v=2`).catch(() => {});
          fetch(`/api/qcf-font/${page + 1}`).catch(() => {});
        }
      } catch {
        // exact layout unavailable — fall back to the Amiri renderer
        if (alive) setExact(null);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Solve the exact page's font size: the widest line must fill the width,
  // fifteen line-slots must fill the height.
  const exactRef = useRef<HTMLDivElement>(null);
  const [exactSize, setExactSize] = useState(22);
  const exactIter = useRef(0);
  useLayoutEffect(() => {
    if (!exact) return;
    const el = exactRef.current;
    const box = el?.parentElement;
    if (!el || !box || exactIter.current >= 8) return;
    const cs = getComputedStyle(box);
    const availW =
      box.clientWidth -
      parseFloat(cs.paddingLeft || "0") -
      parseFloat(cs.paddingRight || "0");
    const availH =
      box.clientHeight -
      parseFloat(cs.paddingTop || "0") -
      parseFloat(cs.paddingBottom || "0");
    let maxW = 0;
    el.querySelectorAll("[data-exact-line]").forEach((n) => {
      maxW = Math.max(maxW, (n as HTMLElement).scrollWidth);
    });
    if (availW <= 0 || availH <= 0 || maxW <= 0) return;
    // Width decides the glyph size (like print); the 15 grid rows already
    // stretch to fill the full height, so no height constraint here.
    const scale = (availW / maxW) * 0.995;
    if (scale < 0.99 || scale > 1.02) {
      exactIter.current++;
      setExactSize((s) => Math.min(42, Math.max(8, s * scale)));
    }
  }, [exact, exactSize]);

  // Render the true 15-line Madani page: word glyphs on their real lines,
  // surah cartouches and the basmalah on the layout's header lines, empty
  // slots preserved (that's what centers Al-Fatiha like the printed page).
  const renderExact = () => {
    if (!exact) return null;
    const hasWords = (n: number) => (exact.lines[n]?.length ?? 0) > 0;
    const headerLines = new Map<
      number,
      { type: "banner" | "bsml"; surah: number }
    >();
    // EVERY surah must open with its banner, and its basmalah (except
    // At-Tawbah; Al-Fatiha's basmalah is its first ayah). Spare layout
    // lines host them when available; otherwise rows are INSERTED before
    // the surah's first line — the opening is never allowed to go missing.
    const inserts = new Map<
      number,
      { surah: number; banner: boolean; bsml: boolean }
    >(); // firstLine -> what to inject before it
    for (const st of exact.starts) {
      let n = st.firstLine - 1;
      const run: number[] = [];
      while (n >= 1 && !hasWords(n) && !headerLines.has(n)) {
        run.unshift(n);
        n--;
      }
      const needsBsml = st.surah !== 1 && st.surah !== 9;
      let hasBanner = false;
      let hasBsml = !needsBsml;
      if (run.length >= 1) {
        headerLines.set(run[0], { type: "banner", surah: st.surah });
        hasBanner = true;
      }
      if (run.length >= 2 && needsBsml) {
        headerLines.set(run[1], { type: "bsml", surah: st.surah });
        hasBsml = true;
      }
      if (!hasBanner || !hasBsml) {
        inserts.set(st.firstLine, {
          surah: st.surah,
          banner: !hasBanner,
          bsml: !hasBsml,
        });
      }
    }
    const bannerRow = (key: string, surah: number) => {
      const meta = surahs.find((x) => x.number === surah);
      return (
        <div
          key={key}
          className="flex items-center min-h-0"
          style={{ fontSize: "0.68em" }}
        >
          <div className="w-full">
            <SurahBanner bare name={meta?.nameArabic ?? ""} />
          </div>
        </div>
      );
    };
    const bsmlRow = (key: string, surah: number) => {
      const a1 = data?.ayahs.find(
        (x) => x.surahNumber === surah && x.ayahNumber === 1,
      );
      const bsmLine = a1 ? getBismillahDisplay(surah, 1, a1.text).line : null;
      return (
        <div
          key={key}
          dir="rtl"
          className="flex items-center justify-center font-quran text-primary min-h-0 text-[0.95em] leading-none"
        >
          {bsmLine ?? "﷽"}
        </div>
      );
    };

    const rows: React.ReactNode[] = [];
    for (let n = 1; n <= 15; n++) {
      // A surah whose layout left no spare lines gets its opening INSERTED
      // right before its first words — the basmalah can never go missing.
      const inj = inserts.get(n);
      if (inj) {
        if (inj.banner) rows.push(bannerRow(`inj-banner-${n}`, inj.surah));
        if (inj.bsml) rows.push(bsmlRow(`inj-bsml-${n}`, inj.surah));
      }
      const words = exact.lines[n];
      if (words?.length) {
        rows.push(
          <div key={n} className="flex items-center justify-center min-h-0">
            <div
              data-exact-line
              dir="rtl"
              className="exact-line whitespace-nowrap leading-none"
              style={{ fontFamily: `QCFP${exact.page}` }}
            >
              {words.map((w, i) => (
                <span
                  key={i}
                  className={[
                    // the ۝-number medallion wears the theme's gold
                    w.e ? "mx-[0.09em] text-accent" : "",
                    playing?.s === w.s && playing?.a === w.a
                      ? "bg-accent-soft rounded-sm"
                      : "",
                  ]
                    .join(" ")
                    .trim() || undefined}
                >
                  {w.c}
                </span>
              ))}
            </div>
          </div>,
        );
      } else {
        const h = headerLines.get(n);
        if (h?.type === "banner") {
          rows.push(bannerRow(String(n), h.surah));
        } else if (h?.type === "bsml") {
          rows.push(bsmlRow(String(n), h.surah));
        } else {
          rows.push(<div key={n} />);
        }
      }
    }
    return (
      <div
        ref={exactRef}
        className="h-full grid"
        style={{
          gridTemplateRows: `repeat(${rows.length}, 1fr)`,
          fontSize: `${exactSize}px`,
        }}
      >
        {rows}
      </div>
    );
  };

  // Fit-to-screen: the WHOLE page must fit the viewport — no scrolling.
  // Text size is solved per page: render, measure, refine.
  const fitRef = useRef<HTMLDivElement>(null);
  const fitIter = useRef(0);
  const [fitSize, setFitSize] = useState(24);

  useEffect(() => {
    fitIter.current = 0;
    setFitSize(24);
  }, [data?.page]);

  useEffect(() => {
    const onResize = () => {
      fitIter.current = 0;
      setFitSize(24);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // CRITICAL: the Quran webfont loads asynchronously and is taller (stacked
  // harakat) than the fallback the first measurements see — without a
  // re-solve on fonts.ready, pages measured too early overflow and the last
  // lines get clipped.
  useEffect(() => {
    let alive = true;
    document.fonts?.ready
      ?.then(() => {
        if (!alive) return;
        fitIter.current = 0;
        setFitSize((s) => s + 0.001); // nudge a re-solve with real metrics
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useLayoutEffect(() => {
    if (!data) return;
    const el = fitRef.current;
    const box = el?.parentElement;
    if (!el || !box) return;
    const avail = box.clientHeight;
    const content = el.scrollHeight;
    if (avail <= 0 || content <= 0 || fitIter.current >= 10) return;
    const ratio = avail / content;
    if (content > avail * 0.995) {
      // overflowing (or razor-thin) — shrink decisively so nothing clips
      fitIter.current++;
      setFitSize((s) => Math.max(10, s * ratio * 0.96));
    } else if (ratio > 1.2 && fitSize < 30) {
      // lots of empty space — grow gently
      fitIter.current++;
      setFitSize((s) => Math.min(30, s * Math.min(ratio * 0.9, 1.25)));
    }
  }, [data, fitSize]);

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

  return (
    <>
      {/* MOBILE: the Quran IS the page — one fitted mushaf page, edge to
          edge. Tap the middle for the chrome; tap again to just read. */}
      <div className="md:hidden fixed inset-0 z-30 bg-background overflow-hidden">
        <div
          {...swipeFull}
          key={"m-" + (exact?.page ?? data.page)}
          onClick={() => {
            if (showCoach) dismissCoach();
            setChrome((c) => !c);
          }}
          className="h-full px-4 fit-center overflow-hidden select-none"
          style={{
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
          }}
        >
          {exact ? (
            renderExact()
          ) : (
            <div
              ref={fitRef}
              className="fit-quran"
              style={{ fontSize: fitSize + "px" }}
            >
              {renderGroups(true)}
            </div>
          )}
        </div>

        {/* edge taps: left = next (Arabic book order), right = previous */}
        <button
          aria-hidden
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            turn(1);
          }}
          className="absolute inset-y-0 left-0 w-[15%] z-10"
        />
        <button
          aria-hidden
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            turn(-1);
          }}
          className="absolute inset-y-0 right-0 w-[15%] z-10"
        />

        {showCoach && !chrome && (
          <div
            className="absolute inset-x-0 z-20 mx-auto w-fit rounded-full bg-primary text-white px-4 py-2 text-xs font-bold shadow-lg animate-rise pointer-events-none"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 14px)" }}
          >
            {t("quran.tapForBars")}
          </div>
        )}

        {/* Always-on page number — just the number, like a printed mushaf.
            The open chrome covers this spot, so it hides then. */}
        {!chrome && (
          <div
            className="absolute inset-x-0 z-10 text-center text-[11px] font-bold text-accent/80 tabular-nums pointer-events-none"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 4px)" }}
          >
            {digits(data.page)}
          </div>
        )}

        {chrome && (
          <>
            <div
              className="absolute top-0 inset-x-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 pb-3 space-y-2.5 animate-rise"
              style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
            >
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setNavOpen(true)}
                  className="min-w-0 flex items-center gap-2 text-start"
                >
                  <span className="text-sm font-bold text-primary truncate">
                    {main ? surahName(lang, main.nameArabic, main.nameTranslit) : ""}
                  </span>
                  <Search size={13} className="text-muted shrink-0" />
                </button>
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
            <BottomTabs force />
          </>
        )}
      </div>

      {/* DESKTOP: the framed reading layout */}
      <div className="hidden md:block pt-1 max-w-2xl mx-auto">
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

        <div {...swipe} key={data.page} className="animate-page select-none">
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
