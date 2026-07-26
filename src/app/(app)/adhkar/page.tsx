"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Check, RotateCcw } from "lucide-react";
import { PageLoader } from "@/components/Brand";
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

export default function AdhkarPage() {
  const { t } = useLang();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<Chapter | null>(null);
  const [query, setQuery] = useState("");
  const [doneToday, setDoneToday] = useState(false);

  useEffect(() => {
    setDoneToday(isAdhkarDoneToday());
  }, []);

  useEffect(() => {
    fetch("/api/adhkar")
      .then((r) => r.json())
      .then((d) => setChapters(d.chapters ?? []))
      .finally(() => setLoaded(true));
  }, []);

  // The featured sections (found by normalized title, not fragile indices).
  const featured = useMemo(() => {
    const find = (frag: string) =>
      chapters.find((c) => strip(c.title).includes(frag)) ?? null;
    return [
      { key: "adhkar.morning", ch: find("الصباح") },
      { key: "adhkar.evening", ch: find("المساء") },
      { key: "adhkar.sleep", ch: find("أذكار النوم") ?? find("اذكار النوم") },
      { key: "adhkar.istikhara", ch: find("الاستخارة") ?? find("الاستخاره") },
    ];
  }, [chapters]);

  if (!loaded) return <PageLoader />;

  if (open) {
    return <ChapterView chapter={open} onBack={() => setOpen(null)} />;
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

      {/* Featured */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {featured.map(
          (f) =>
            f.ch && (
              <button
                key={f.key}
                onClick={() => setOpen(f.ch)}
                className="card p-4 grid place-items-center text-center hover:border-primary/40 active:scale-[0.97] transition"
              >
                <span className="text-[15px] font-bold leading-tight">
                  {t(f.key)}
                </span>
              </button>
            ),
        )}
      </div>

      {/* All chapters */}
      <div>
        <div className="text-xs font-bold text-muted mb-2 px-1">
          {t("adhkar.allChapters")}
        </div>
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
        <div className="card divide-y divide-border overflow-hidden">
          {list.map((c) => (
            <button
              key={c.index}
              onClick={() => setOpen(c)}
              className="w-full flex items-center justify-between gap-3 p-3.5 text-start hover:bg-surface-2 transition"
            >
              <span className="text-[15px] font-medium">{c.title}</span>
              <span className="text-[11px] text-muted shrink-0">{c.count}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-muted text-center">{t("adhkar.source")}</p>
    </div>
  );
}

function ChapterView({
  chapter,
  onBack,
}: {
  chapter: Chapter;
  onBack: () => void;
}) {
  const { t } = useLang();
  const [items, setItems] = useState<Dhikr[] | null>(null);

  useEffect(() => {
    fetch(`/api/adhkar?chapter=${chapter.index}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []));
  }, [chapter.index]);

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

      {items.map((d) => (
        <DhikrCard key={d.id} d={d} />
      ))}

      <p className="text-[11px] text-muted text-center pb-4">
        {t("adhkar.source")}
      </p>
    </div>
  );
}

// One dhikr with a tasbih-style tap counter toward its prescribed count.
// Counts persist per day and keep going past the target (e.g. 35/33).
function DhikrCard({ d }: { d: Dhikr }) {
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
