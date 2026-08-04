"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Check, RotateCcw } from "lucide-react";
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
