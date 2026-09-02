"use client";

import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Check, RotateCcw, X } from "lucide-react";
import { PageLoader } from "@/components/Brand";
import { WirdStrip } from "@/components/WirdCard";
import { useLang } from "@/components/LanguageProvider";
import {
  adhkarPartsToday,
  dayKey,
  isAdhkarDoneToday,
  markAdhkarDoneToday,
  markAdhkarPart,
  type AdhkarPart,
} from "@/lib/wird";

// Tap counts survive navigation and reload — stored per calendar day, so
// yesterday's counts never leak into today.
function tapsStorageKey(): string {
  return `aqim-adhkar-taps:${dayKey()}`;
}
function loadTaps(id: number): number {
  try {
    const m = JSON.parse(localStorage.getItem(tapsStorageKey()) ?? "{}");
    return Number(m[id]) || 0;
  } catch {
    return 0;
  }
}
function saveTaps(id: number, taps: number) {
  try {
    const key = tapsStorageKey();
    const m = JSON.parse(localStorage.getItem(key) ?? "{}");
    if (taps > 0) m[id] = taps;
    else delete m[id];
    localStorage.setItem(key, JSON.stringify(m));
  } catch {}
}

interface Chapter {
  index: number;
  title: string;
  count: number;
}
interface Dhikr {
  id: number;
  text: string;
  count: number;
  reference: string | null;
}

const strip = (s: string) => s.normalize("NFC").replace(/\p{M}/gu, "");

// The chapter lives in the URL (?chapter=N) so the phone's back gesture
// returns to the list and a refresh restores the open chapter.
export default function AdhkarPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdhkarInner />
    </Suspense>
  );
}

function AdhkarInner() {
  const { t } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [doneToday, setDoneToday] = useState(false);
  const [parts, setParts] = useState(() => ({
    morning: false,
    evening: false,
    sleep: false,
  }));

  const chapterParam = Number(searchParams.get("chapter")) || null;
  const open = chapterParam
    ? (chapters.find((c) => c.index === chapterParam) ?? null)
    : null;
  const setOpen = (c: Chapter | null) =>
    router.push(c ? `/adhkar?chapter=${c.index}` : "/adhkar");

  useEffect(() => {
    const read = () => {
      setDoneToday(isAdhkarDoneToday());
      setParts(adhkarPartsToday());
    };
    read();
    window.addEventListener("aqim-wird-changed", read);
    return () => window.removeEventListener("aqim-wird-changed", read);
  }, [chapterParam]);

  // Paint instantly from the last visit's snapshot; refresh silently.
  const [loadFailed, setLoadFailed] = useState(false);
  useLayoutEffect(() => {
    try {
      const raw = sessionStorage.getItem("aqim-c:adhkar");
      if (raw) {
        const v = JSON.parse(raw);
        if (Array.isArray(v) && v.length) {
          setChapters(v);
          setLoaded(true);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetch("/api/adhkar")
      .then((r) => r.json())
      .then((d) => {
        const list = d.chapters ?? [];
        setChapters(list);
        setLoadFailed(false);
        try {
          sessionStorage.setItem("aqim-c:adhkar", JSON.stringify(list));
        } catch {}
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoaded(true));
  }, []);

  // The featured trio (found by normalized title, not fragile indices) —
  // the rest of the chapters stay hidden until searched or expanded.
  const featured = useMemo(() => {
    const find = (frag: string) =>
      chapters.find((c) => strip(c.title).includes(frag)) ?? null;
    return [
      { key: "adhkar.morning", part: "morning" as AdhkarPart, ch: find("الصباح") },
      { key: "adhkar.evening", part: "evening" as AdhkarPart, ch: find("المساء") },
      {
        key: "adhkar.sleep",
        part: "sleep" as AdhkarPart,
        ch: find("أذكار النوم") ?? find("اذكار النوم"),
      },
      {
        key: "adhkar.salah",
        part: null,
        ch: find("بعد السلام") ?? find("بعد الصلاة"),
      },
    ];
  }, [chapters]);
  const [showAll, setShowAll] = useState(false);

  // Push notifications deep-link here with ?goto=salah — resolve it to the
  // real chapter once the list is loaded.
  useEffect(() => {
    if (searchParams.get("goto") !== "salah" || chapters.length === 0) return;
    const ch =
      chapters.find((c) => strip(c.title).includes("بعد السلام")) ??
      chapters.find((c) => strip(c.title).includes("بعد الصلاة"));
    if (ch) router.replace(`/adhkar?chapter=${ch.index}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters, searchParams]);

  if (!loaded) return <PageLoader />;

  // A network failure is not "no adhkar" — offer a retry.
  if (chapters.length === 0 && loadFailed) {
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

  if (open) {
    const st = strip(open.title);
    const part: AdhkarPart | null = st.includes("الصباح")
      ? "morning"
      : st.includes("المساء")
        ? "evening"
        : st.includes("النوم")
          ? "sleep"
          : null;
    return (
      <ChapterView
        chapter={open}
        part={part}
        isSalah={st.includes("بعد السلام") || st.includes("بعد الصلاة")}
        onBack={() => setOpen(null)}
      />
    );
  }

  const q = query.trim();
  const list = q
    ? chapters.filter((c) => strip(c.title).includes(strip(q)))
    : chapters;

  return (
    <div className="space-y-5 pt-2 max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold mb-1">{t("adhkar.title")}</h1>
          <p className="text-sm text-muted">{t("adhkar.subtitle")}</p>
        </div>
        <button
          onClick={() => {
            markAdhkarDoneToday();
            setDoneToday(true);
          }}
          disabled={doneToday}
          className={`shrink-0 px-3.5 py-2 text-xs font-bold rounded-full transition ${
            doneToday ? "bg-secondary text-white" : "btn-accent !rounded-full"
          } disabled:opacity-90`}
        >
          {doneToday ? <Check size={14} /> : t("adhkar.doneToday")}
        </button>
      </div>

      {/* Daily wird — lives here with the daily remembrances */}
      <WirdStrip />

      {/* Featured: the three daily-cycle chapters + after-prayer adhkar */}
      <div className="grid grid-cols-2 gap-3">
        {featured.map((f) => {
          if (!f.ch) return null;
          const done = f.part ? parts[f.part] : false;
          return (
            <button
              key={f.key}
              onClick={() => setOpen(f.ch)}
              className={`tile p-4 flex flex-col items-start justify-between gap-3 text-start active:scale-[0.97] transition min-h-28 ${
                done
                  ? "bg-secondary-soft"
                  : f.key === "adhkar.salah"
                    ? "tile-gold"
                    : "tile-blue"
              }`}
            >
              {f.part ? (
                <span
                  className={`w-6 h-6 rounded-full grid place-items-center ${
                    done ? "bg-secondary text-white" : "bg-surface"
                  }`}
                >
                  {done && <Check size={13} strokeWidth={3} />}
                </span>
              ) : (
                <span className="w-6 h-6 rounded-full bg-surface" />
              )}
              <span className="text-[15px] font-extrabold leading-tight">
                {t(f.key)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Everything else appears only on search or on demand */}
      <div>
        <div className="relative mb-3">
          <Search
            size={16}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("adhkar.searchPh")}
            className="w-full rounded-xl border border-border bg-surface ps-9 pe-3 py-2.5 text-sm"
          />
        </div>

        {!q && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full card p-3.5 text-sm font-bold text-primary text-center hover:border-primary/40 transition"
          >
            {t("adhkar.showAll")}
          </button>
        )}

        {(q || showAll) && (
          <>
            {!q && (
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold text-muted">
                  {t("adhkar.allChapters")}
                </span>
                <button
                  onClick={() => setShowAll(false)}
                  className="text-[11px] text-muted hover:text-foreground"
                >
                  {t("adhkar.hideAll")}
                </button>
              </div>
            )}
            {q && list.length === 0 && (
              <p className="card p-6 text-sm text-muted text-center">
                {t("setup.noResults")}
              </p>
            )}
            <div className="card divide-y divide-border overflow-hidden">
              {list.map((c) => (
                <button
                  key={c.index}
                  onClick={() => setOpen(c)}
                  className="w-full flex items-center justify-between gap-3 p-3.5 text-start hover:bg-surface-2 transition"
                >
                  <span className="text-[15px] font-medium">{c.title}</span>
                  <span className="text-[11px] text-muted shrink-0">
                    {c.count}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <p className="text-[11px] text-muted text-center">{t("adhkar.source")}</p>
    </div>
  );
}

function ChapterView({
  chapter,
  part,
  isSalah = false,
  onBack,
}: {
  chapter: Chapter;
  part: AdhkarPart | null;
  isSalah?: boolean;
  onBack: () => void;
}) {
  const { t } = useLang();
  const [items, setItems] = useState<Dhikr[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showTapHint, setShowTapHint] = useState(false);

  useEffect(() => {
    fetch(`/api/adhkar?chapter=${chapter.index}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []));
    try {
      setShowTapHint(!localStorage.getItem("aqim-adhkar-hint"));
    } catch {}
  }, [chapter.index]);

  // Completing 10 dhikr cards of a morning/evening/sleep chapter (or all of
  // them if it has fewer) fills its segment of the daily cycle; the third
  // segment completes the day. Doing more is welcome — 10 is what counts.
  const ENOUGH = 10;
  function onCardComplete() {
    if (showTapHint) {
      setShowTapHint(false);
      try {
        localStorage.setItem("aqim-adhkar-hint", "1");
      } catch {}
    }
    if (!part || !items || adhkarPartsToday()[part]) return;
    const doneCards = items.filter((it) => loadTaps(it.id) >= it.count).length;
    if (doneCards >= Math.min(ENOUGH, items.length)) {
      const wholeDay = markAdhkarPart(part);
      setToast(
        wholeDay
          ? t("adhkar.doneToday")
          : t("adhkar.partDone", { c: chapter.title }),
      );
      setTimeout(() => setToast(null), 5000);
    }
  }

  if (!items) return <PageLoader />;

  // Morning/evening are meant to be worked through one at a time, in order —
  // a full-screen snap deck (Stories-style). Sleep, after-prayer, and any
  // chapter opened via search stay a normal scrollable list.
  if (part === "morning" || part === "evening") {
    return (
      <>
        <SnapDeck
          items={items}
          title={chapter.title}
          onBack={onBack}
          onComplete={onCardComplete}
        />
        {toast && (
          <div
            className="fixed inset-x-0 z-50 px-4 animate-rise"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 64px)" }}
          >
            <div className="mx-auto w-fit flex items-center gap-2 rounded-full bg-secondary text-white px-5 py-2.5 text-sm font-bold shadow-lg">
              <Check size={16} strokeWidth={3} />
              {toast}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-4 pt-2 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{chapter.title}</h1>
        <button
          onClick={onBack}
          className="text-sm text-primary font-bold whitespace-nowrap"
        >
          {t("adhkar.back")}
        </button>
      </div>

      {/* After-prayer adhkar pair naturally with the misbaha */}
      {isSalah && (
        <a
          href="/tasbih"
          className="tile tile-teal p-4 flex items-center justify-between gap-3 active:scale-[0.98] transition"
        >
          <span className="text-sm font-extrabold">{t("tasbih.title")}</span>
          <span className="text-xs text-muted">{t("adhkar.openTasbih")}</span>
        </a>
      )}

      {showTapHint && (
        <p className="text-[11px] text-muted bg-surface-2 rounded-xl p-2.5 text-center">
          {t("adhkar.tapHint")}
        </p>
      )}

      {toast && (
        <div className="fixed inset-x-0 top-[72px] z-30 px-4 animate-rise">
          <div className="mx-auto w-fit flex items-center gap-2 rounded-full bg-secondary text-white px-5 py-2.5 text-sm font-bold shadow-lg">
            <Check size={16} strokeWidth={3} />
            {toast}
          </div>
        </div>
      )}

      {items.map((d) => (
        <DhikrCard key={d.id} d={d} onComplete={onCardComplete} />
      ))}

      <p className="text-[11px] text-muted text-center pb-4">
        {t("adhkar.source")}
      </p>
    </div>
  );
}

// Full-screen, one-at-a-time deck for morning/evening adhkar — CSS
// scroll-snap does the actual snapping; an IntersectionObserver just watches
// which screen is currently in view to drive the progress bar. Fixed to
// cover the whole viewport (header/bottom nav included) so it reads as a
// true full-screen experience regardless of the app shell around it.
function SnapDeck({
  items,
  title,
  onBack,
  onComplete,
}: {
  items: Dhikr[];
  title: string;
  onBack: () => void;
  onComplete?: () => void;
}) {
  const { t } = useLang();
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = sectionRefs.current.indexOf(
              entry.target as HTMLDivElement,
            );
            if (idx !== -1) setActive(idx);
          }
        }
      },
      { root: container, threshold: 0.6 },
    );
    for (const el of sectionRefs.current) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [items.length]);

  return (
    <div className="fixed inset-0 z-40 bg-[#33546A]" dir="rtl">
      {/* Header: close + chapter title */}
      <div
        className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pb-2"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)" }}
      >
        <button
          onClick={onBack}
          aria-label={t("adhkar.back")}
          className="w-9 h-9 rounded-full grid place-items-center text-[#F3EEE3]/90 hover:bg-white/10 transition"
        >
          <X size={20} />
        </button>
        <span className="text-[13px] font-bold text-[#F3EEE3]/90 truncate max-w-[60%]">
          {title}
        </span>
        <span className="w-9" aria-hidden />
      </div>

      {/* Stories-style progress segments */}
      <div
        className="absolute inset-x-0 top-0 z-10 flex gap-1 px-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 52px)" }}
      >
        {items.map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden"
          >
            <div
              className="h-full bg-[#F3EEE3] transition-all duration-200"
              style={{ width: i <= active ? "100%" : "0%" }}
            />
          </div>
        ))}
      </div>

      <div
        ref={containerRef}
        className="h-full w-full overflow-y-auto"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {items.map((d, i) => (
          <div
            key={d.id}
            ref={(el) => {
              sectionRefs.current[i] = el;
            }}
            style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
            className="h-dvh w-full"
          >
            <DhikrFullScreen d={d} onComplete={onComplete} />
          </div>
        ))}
      </div>
    </div>
  );
}

// One full-screen dhikr — same tap-to-count behavior/storage as the list
// view's DhikrCard, just laid out to fill the screen.
function DhikrFullScreen({
  d,
  onComplete,
}: {
  d: Dhikr;
  onComplete?: () => void;
}) {
  const { t } = useLang();
  const [taps, setTaps] = useState(0);
  const [refOpen, setRefOpen] = useState(false);
  useEffect(() => {
    setTaps(loadTaps(d.id));
  }, [d.id]);
  const done = taps >= d.count;

  function bump() {
    const next = taps + 1;
    setTaps(next);
    saveTaps(d.id, next);
    try {
      navigator.vibrate?.(10);
    } catch {}
    if (next >= d.count) onComplete?.();
  }
  function reset(e: React.MouseEvent) {
    e.stopPropagation();
    if (taps > 10 && !window.confirm(t("adhkar.resetConfirm"))) return;
    setTaps(0);
    saveTaps(d.id, 0);
  }

  return (
    <button
      onClick={bump}
      className="relative w-full h-full flex flex-col items-center justify-center text-center px-7"
    >
      <p
        className="font-quran text-[26px] leading-[2.1] text-[#F3EEE3]"
        dir="rtl"
      >
        {d.text}
      </p>

      {refOpen && d.reference && (
        <p
          className="font-ui text-xs text-[#F3EEE3]/70 leading-relaxed mt-5 max-w-sm"
          dir="rtl"
          onClick={(e) => {
            e.stopPropagation();
            setRefOpen(false);
          }}
        >
          {d.reference}
        </p>
      )}

      <div
        className="absolute inset-x-0 flex flex-col items-center gap-2.5 px-6"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 28px)" }}
      >
        {d.reference && !refOpen && (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              setRefOpen(true);
            }}
            className="font-ui text-[11px] text-[#F3EEE3]/60 underline decoration-dotted truncate max-w-full"
          >
            {d.reference}
          </span>
        )}
        <div className="flex items-center gap-3">
          {d.count > 1 && (
            <span className="font-ui text-[11px] text-[#F3EEE3]/70">
              {t("adhkar.reps")}: ×{d.count}
            </span>
          )}
          <span
            className={`min-w-11 h-8 px-2.5 rounded-full flex items-center justify-center gap-1 text-sm font-bold tabular-nums ${
              done ? "bg-[#B99257] text-[#33546A]" : "bg-white/15 text-[#F3EEE3]"
            }`}
          >
            {done && <Check size={14} />}
            {`${taps}/${d.count}`}
          </span>
          {taps > 0 && (
            <span
              role="button"
              aria-label={t("adhkar.reset")}
              onClick={reset}
              className="w-8 h-8 rounded-full grid place-items-center text-[#F3EEE3]/70 hover:bg-white/10 transition"
            >
              <RotateCcw size={15} />
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// One dhikr with a tasbih-style tap counter toward its prescribed count.
// Counts persist per day and keep going past the target (e.g. 35/33).
function DhikrCard({
  d,
  onComplete,
}: {
  d: Dhikr;
  onComplete?: () => void;
}) {
  const { t } = useLang();
  const [taps, setTaps] = useState(0);
  const [refOpen, setRefOpen] = useState(false);
  useEffect(() => {
    setTaps(loadTaps(d.id));
  }, [d.id]);
  const done = taps >= d.count;

  function bump() {
    const next = taps + 1;
    setTaps(next);
    saveTaps(d.id, next);
    try {
      navigator.vibrate?.(10);
    } catch {}
    if (next >= d.count) onComplete?.();
  }
  function reset(e: React.MouseEvent) {
    e.stopPropagation();
    if (taps > 10 && !window.confirm(t("adhkar.resetConfirm"))) return;
    setTaps(0);
    saveTaps(d.id, 0);
  }

  return (
    <button
      onClick={bump}
      className={`card w-full text-start p-5 transition active:scale-[0.995] ${
        done ? "border-secondary/50 bg-secondary-soft/40" : ""
      }`}
    >
      <p className="font-quran text-xl leading-[2] " dir="rtl">
        {d.text}
      </p>

      {/* Reference / reward — tap to read it in full (no more "…") */}
      {refOpen && d.reference && (
        <p
          className="text-xs text-muted leading-relaxed mt-3 bg-surface-2 rounded-xl p-3"
          dir="rtl"
          onClick={(e) => {
            e.stopPropagation();
            setRefOpen(false);
          }}
        >
          {d.reference}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-border">
        <span
          role={d.reference && !refOpen ? "button" : undefined}
          onClick={(e) => {
            if (!d.reference) return;
            e.stopPropagation();
            setRefOpen(!refOpen);
          }}
          className={`text-[11px] text-muted truncate ${
            d.reference && !refOpen ? "underline decoration-dotted" : ""
          }`}
        >
          {refOpen ? "" : (d.reference ?? "")}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {d.count > 1 && (
            <span className="text-[11px] text-muted">
              {t("adhkar.reps")}: ×{d.count}
            </span>
          )}
          <span
            className={`min-w-11 h-8 px-2.5 rounded-full flex items-center justify-center gap-1 text-sm font-bold tabular-nums ${
              done
                ? "bg-secondary text-white"
                : "bg-primary-soft text-primary"
            }`}
          >
            {done && <Check size={14} />}
            {`${taps}/${d.count}`}
          </span>
          {taps > 0 && (
            <span
              role="button"
              aria-label={t("adhkar.reset")}
              onClick={reset}
              className="w-8 h-8 rounded-full grid place-items-center text-muted hover:text-foreground hover:bg-surface-2 transition"
            >
              <RotateCcw size={15} />
            </span>
          )}
        </span>
      </div>
    </button>
  );
}
