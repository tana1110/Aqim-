"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Check, RotateCcw } from "lucide-react";
import { PageLoader } from "@/components/Brand";
import { WirdStrip } from "@/components/WirdCard";
import { useLang } from "@/components/LanguageProvider";
import { dayKey, isAdhkarDoneToday, markAdhkarDoneToday } from "@/lib/wird";

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

  const chapterParam = Number(searchParams.get("chapter")) || null;
  const open = chapterParam
    ? (chapters.find((c) => c.index === chapterParam) ?? null)
    : null;
  const setOpen = (c: Chapter | null) =>
    router.push(c ? `/adhkar?chapter=${c.index}` : "/adhkar");

  useEffect(() => {
    setDoneToday(isAdhkarDoneToday());
  }, []);

  useEffect(() => {
    fetch("/api/adhkar")
      .then((r) => r.json())
      .then((d) => setChapters(d.chapters ?? []))
      .finally(() => setLoaded(true));
  }, []);

  // The featured trio (found by normalized title, not fragile indices) —
  // the rest of the chapters stay hidden until searched or expanded.
  const featured = useMemo(() => {
    const find = (frag: string) =>
      chapters.find((c) => strip(c.title).includes(frag)) ?? null;
    return [
      { key: "adhkar.morning", ch: find("الصباح") },
      { key: "adhkar.evening", ch: find("المساء") },
      { key: "adhkar.sleep", ch: find("أذكار النوم") ?? find("اذكار النوم") },
    ];
  }, [chapters]);
  const [showAll, setShowAll] = useState(false);

  if (!loaded) return <PageLoader />;

  if (open) {
    const st = strip(open.title);
    return (
      <ChapterView
        chapter={open}
        isDaily={st.includes("الصباح") || st.includes("المساء")}
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

      {/* Featured: the three daily ones, front and center */}
      <div className="grid grid-cols-3 gap-2.5">
        {featured.map(
          (f) =>
            f.ch && (
              <button
                key={f.key}
                onClick={() => setOpen(f.ch)}
                className="card p-4 grid place-items-center text-center hover:border-primary/40 active:scale-[0.97] transition min-h-20"
              >
                <span className="text-[15px] font-bold leading-tight">
                  {t(f.key)}
                </span>
              </button>
            ),
        )}
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
  isDaily,
  onBack,
}: {
  chapter: Chapter;
  isDaily: boolean;
  onBack: () => void;
}) {
  const { t } = useLang();
  const [items, setItems] = useState<Dhikr[] | null>(null);
  const [autoDone, setAutoDone] = useState(false);
  const [showTapHint, setShowTapHint] = useState(false);

  useEffect(() => {
    fetch(`/api/adhkar?chapter=${chapter.index}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []));
    try {
      setShowTapHint(!localStorage.getItem("aqim-adhkar-hint"));
    } catch {}
  }, [chapter.index]);

  // Completing every dhikr of a morning/evening chapter auto-marks the
  // daily adhkar as done.
  function onCardComplete() {
    if (showTapHint) {
      setShowTapHint(false);
      try {
        localStorage.setItem("aqim-adhkar-hint", "1");
      } catch {}
    }
    if (!isDaily || !items || isAdhkarDoneToday()) return;
    if (items.every((it) => loadTaps(it.id) >= it.count)) {
      markAdhkarDoneToday();
      setAutoDone(true);
      setTimeout(() => setAutoDone(false), 5000);
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

      {showTapHint && (
        <p className="text-[11px] text-muted bg-surface-2 rounded-xl p-2.5 text-center">
          {t("adhkar.tapHint")}
        </p>
      )}

      {autoDone && (
        <div className="fixed inset-x-0 top-[72px] z-30 px-4 animate-rise">
          <div className="mx-auto w-fit flex items-center gap-2 rounded-full bg-secondary text-white px-5 py-2.5 text-sm font-bold shadow-lg">
            <Check size={16} strokeWidth={3} />
            {t("adhkar.doneToday")}
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

      <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-border">
        <span className="text-[11px] text-muted truncate">
          {d.reference ?? ""}
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
