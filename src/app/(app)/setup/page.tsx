"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Search, X } from "lucide-react";
import { PageLoader } from "@/components/Brand";
import { useLang } from "@/components/LanguageProvider";
import { surahName } from "@/lib/quranDisplay";
import type { SurahMeta } from "@/lib/types";

interface JuzSegment {
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
}
interface Juz {
  juz: number;
  segments: JuzSegment[];
}

// Does this set of ranges fully cover [a, b] of surah n (merging overlaps)?
function coveredBy(
  ranges: JuzSegment[],
  n: number,
  a: number,
  b: number,
): boolean {
  const list = ranges
    .filter((r) => r.surahNumber === n)
    .map((r) => [r.fromAyah, r.toAyah] as [number, number])
    .sort((x, y) => x[0] - y[0]);
  const merged: [number, number][] = [];
  for (const iv of list) {
    const last = merged[merged.length - 1];
    if (last && iv[0] <= last[1] + 1) last[1] = Math.max(last[1], iv[1]);
    else merged.push([...iv]);
  }
  return merged.some(([x, y]) => x <= a && b <= y);
}

// Order-independent fingerprint of a selection, for dirty-state tracking.
function selectionKey(surahs: Set<number>, juz: Set<number>): string {
  return (
    [...surahs].sort((a, b) => a - b).join(",") +
    "|" +
    [...juz].sort((a, b) => a - b).join(",")
  );
}

// The saved memorization = every fully-selected surah, plus the segments of
// each selected juz (minus surahs already covered in full).
function buildRangesFrom(
  selectedSurahs: Set<number>,
  selectedJuz: Set<number>,
  juzList: Juz[],
  ayahCountBySurah: Map<number, number>,
): JuzSegment[] {
  const ranges: JuzSegment[] = [];
  for (const n of selectedSurahs) {
    ranges.push({
      surahNumber: n,
      fromAyah: 1,
      toAyah: ayahCountBySurah.get(n) ?? 1,
    });
  }
  for (const j of selectedJuz) {
    const juz = juzList.find((x) => x.juz === j);
    if (!juz) continue;
    for (const seg of juz.segments) {
      if (selectedSurahs.has(seg.surahNumber)) continue;
      ranges.push(seg);
    }
  }
  return ranges;
}

export default function SetupPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [juzList, setJuzList] = useState<Juz[]>([]);
  const [selectedSurahs, setSelectedSurahs] = useState<Set<number>>(new Set());
  const [selectedJuz, setSelectedJuz] = useState<Set<number>>(new Set());
  const [tab, setTab] = useState<"surah" | "juz">("surah");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [seeded, setSeeded] = useState(true);
  // Snapshot of the last-saved selection — the save bar appears on any change.
  const [savedKey, setSavedKey] = useState("");
  // Saved partial ranges that the surah/juz pickers can't represent — kept
  // untouched on every save so re-saving never silently deletes them.
  const [extras, setExtras] = useState<JuzSegment[]>([]);

  useEffect(() => {
    async function load() {
      const [sRes, jRes, mRes] = await Promise.all([
        fetch("/api/surahs").then((r) => r.json()),
        fetch("/api/juz").then((r) => r.json()),
        fetch("/api/memorization").then((r) => r.json()),
      ]);
      const s: SurahMeta[] = sRes.surahs ?? [];
      setSurahs(s);
      setJuzList(jRes.juz ?? []);
      setSeeded(s.length === 114);

      const byNumber = new Map(s.map((x) => [x.number, x]));
      const saved: JuzSegment[] = mRes.memorization ?? [];
      const preselect = new Set<number>();
      for (const r of saved) {
        const meta = byNumber.get(r.surahNumber);
        if (meta && r.fromAyah === 1 && r.toAyah >= meta.ayahCount) {
          preselect.add(r.surahNumber);
        }
      }
      // Reconstruct juz selections: a juz is selected iff every one of its
      // segments is covered by what was saved.
      const preJuz = new Set<number>();
      for (const j of (jRes.juz ?? []) as Juz[]) {
        if (
          j.segments.length > 0 &&
          j.segments.every((seg) =>
            coveredBy(saved, seg.surahNumber, seg.fromAyah, seg.toAyah),
          )
        )
          preJuz.add(j.juz);
      }
      // Anything saved that the pickers above don't represent (partial
      // ranges) is preserved verbatim.
      const counts = new Map(s.map((x) => [x.number, x.ayahCount]));
      const implied = buildRangesFrom(preselect, preJuz, jRes.juz ?? [], counts);
      setExtras(
        saved.filter(
          (r) => !coveredBy(implied, r.surahNumber, r.fromAyah, r.toAyah),
        ),
      );
      setSelectedSurahs(preselect);
      setSelectedJuz(preJuz);
      setSavedKey(selectionKey(preselect, preJuz));
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, []);

  const ayahCountBySurah = useMemo(
    () => new Map(surahs.map((s) => [s.number, s.ayahCount])),
    [surahs],
  );

  function toggleSurah(n: number) {
    setSelectedSurahs((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });
  }
  function toggleJuz(j: number) {
    const adding = !selectedJuz.has(j);
    setSelectedJuz((prev) => {
      const next = new Set(prev);
      adding ? next.add(j) : next.delete(j);
      return next;
    });
    // Picking a juz also checks every surah fully contained in it, so the
    // selection is visible on the surah tab too.
    const juz = juzList.find((x) => x.juz === j);
    if (!juz) return;
    const fullSurahs = juz.segments
      .filter(
        (seg) =>
          seg.fromAyah === 1 &&
          seg.toAyah >= (ayahCountBySurah.get(seg.surahNumber) ?? Infinity),
      )
      .map((seg) => seg.surahNumber);
    if (fullSurahs.length === 0) return;
    setSelectedSurahs((prev) => {
      const next = new Set(prev);
      for (const n of fullSurahs) adding ? next.add(n) : next.delete(n);
      return next;
    });
  }

  function buildRanges(): JuzSegment[] {
    return buildRangesFrom(selectedSurahs, selectedJuz, juzList, ayahCountBySurah);
  }

  async function save() {
    // Saving with nothing selected wipes the memorization — confirm first.
    if (
      selectedSurahs.size + selectedJuz.size === 0 &&
      !window.confirm(t("setup.confirmClear"))
    )
      return;
    setSaving(true);
    setSaveError(false);
    try {
      // The pickers' ranges plus every preserved partial range that the new
      // selection doesn't already cover.
      const built = buildRanges();
      const ranges = [
        ...built,
        ...extras.filter(
          (e) => !coveredBy(built, e.surahNumber, e.fromAyah, e.toAyah),
        ),
      ];
      const res = await fetch("/api/memorization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ranges }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSavedKey(selectionKey(selectedSurahs, selectedJuz));
      // Stay here — offer (don't force) the trip home. Card stays until
      // dismissed.
      setSavedToast(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = selectedSurahs.size + selectedJuz.size;
  const isDirty = selectionKey(selectedSurahs, selectedJuz) !== savedKey;

  // Leaving the tab/app with unsaved changes gets a browser confirm.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);


  if (loading) return <Loading />;

  if (!seeded) {
    return (
      <div className="card p-6 text-center text-sm text-muted mt-6">
        {t("setup.notSeeded")}
      </div>
    );
  }

  return (
    <div className="space-y-5 pt-2 pb-4">
      {/* Saved — a big, obvious prompt AT THE TOP (dismissible, never a
          forced redirect) */}
      {savedToast && (
        <div className="fixed inset-x-0 top-[72px] z-30 px-4 animate-rise">
          <div className="mx-auto max-w-md rounded-2xl bg-primary text-white p-5 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <span className="flex items-center gap-2.5 text-base font-bold">
                <span className="w-8 h-8 rounded-full bg-white/15 grid place-items-center shrink-0">
                  <Check size={18} strokeWidth={3} />
                </span>
                {t("setup.savedTitle")}
              </span>
              <button
                onClick={() => setSavedToast(false)}
                aria-label="dismiss"
                className="text-white/60 hover:text-white shrink-0"
              >
                <X size={18} />
              </button>
            </div>
            <button
              onClick={() => router.push("/home")}
              className="btn-cta w-full !rounded-full py-3 text-base mt-4"
            >
              {t("setup.goHome")}
            </button>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold mb-1">{t("setup.title")}</h1>
        <p className="text-sm text-muted">{t("setup.subtitle")}</p>
      </div>

      {extras.length > 0 && (
        <p className="text-xs text-muted bg-surface-2 rounded-xl p-3">
          {t("setup.partialKept", { n: extras.length })}
        </p>
      )}

      {/* Save bar — appears AT THE TOP the moment anything is selected and
          stays stuck under the header while scrolling. In normal flow, so it
          never covers the last rows of the list. */}
      {(isDirty || selectedCount > 0) && (
        <div className="sticky top-[64px] z-10 animate-rise">
          <div className="card flex items-center justify-between gap-3 p-2.5 ps-4 shadow-lg">
            <span className="text-sm font-medium">
              {t("setup.selMix", {
                s: selectedSurahs.size,
                j: selectedJuz.size,
              })}
            </span>
            <button
              onClick={save}
              disabled={saving || !isDirty}
              className="btn-cta px-8 py-2.5 text-sm flex items-center gap-1.5 disabled:opacity-70"
            >
              {saving ? (
                t("setup.saving")
              ) : !isDirty ? (
                <>
                  <Check size={16} /> {t("common.saved")}
                </>
              ) : (
                t("common.save")
              )}
            </button>
          </div>
          {saveError && (
            <div className="card mt-2 p-3 text-sm flex items-center justify-between gap-3 border-accent/60">
              <span>{t("setup.saveFailed")}</span>
              <button onClick={save} className="btn-primary px-4 py-1.5 text-xs">
                {t("common.retry")}
              </button>
            </div>
          )}
        </div>
      )}


      {/* Quick select — the most common bundles in one tap */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-muted">
          {t("setup.quick")}:
        </span>
        <button
          onClick={() =>
            setSelectedJuz((prev) => new Set(prev).add(30))
          }
          className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-bold hover:border-primary/40 active:scale-[0.97] transition"
        >
          {t("setup.quick.juzAmma")}
        </button>
        <button
          onClick={() =>
            setSelectedSurahs((prev) => {
              const next = new Set(prev);
              for (let n = 105; n <= 114; n++) next.add(n);
              return next;
            })
          }
          className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-bold hover:border-primary/40 active:scale-[0.97] transition"
        >
          {t("setup.quick.last10")}
        </button>
        {selectedCount > 0 && (
          <button
            onClick={() => {
              setSelectedSurahs(new Set());
              setSelectedJuz(new Set());
            }}
            className="rounded-full px-3.5 py-1.5 text-xs font-bold text-muted hover:text-foreground active:scale-[0.97] transition"
          >
            {t("setup.clearAll")}
          </button>
        )}
      </div>

      <div className="flex gap-2 p-1 bg-surface-2 rounded-2xl">
        {(["surah", "juz"] as const).map((tb) => {
          const count = tb === "surah" ? selectedSurahs.size : selectedJuz.size;
          return (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`flex-1 rounded-xl py-2 text-sm font-bold transition flex items-center justify-center gap-1.5 ${
                tab === tb ? "bg-surface text-primary shadow-sm" : "text-muted"
              }`}
            >
              {tb === "surah" ? t("setup.bySurah") : t("setup.byJuz")}
              {count > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full bg-primary text-white text-[10px] grid place-items-center tabular-nums">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "surah" && (
        <>
          {/* Instant search — no scrolling through 114 cards */}
          <div className="relative">
            <Search
              size={16}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("setup.search")}
              className="w-full rounded-xl border border-border bg-surface ps-9 pe-3 py-2.5 text-sm"
            />
          </div>
          <SurahGrid
            surahs={surahs.filter((s) => {
              const q = query.trim().toLowerCase();
              if (!q) return true;
              return (
                s.nameArabic.replace(/[ً-ْٰ]/g, "").includes(q) ||
                s.nameArabic.includes(q) ||
                s.nameTranslit.toLowerCase().includes(q) ||
                s.nameEnglish.toLowerCase().includes(q) ||
                String(s.number) === q
              );
            })}
            emptyText={t("setup.noResults")}
            lang={lang}
            selected={selectedSurahs}
            toggle={toggleSurah}
            ayahsLabel={t("setup.ayahs")}
          />
        </>
      )}

      {tab === "juz" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
          {juzList.map((j) => {
            const on = selectedJuz.has(j.juz);
            const first = j.segments[0];
            const last = j.segments[j.segments.length - 1];
            const nameOf = (n?: number) => {
              const meta = n ? surahs.find((x) => x.number === n) : null;
              return meta
                ? surahName(lang as "ar" | "en", meta.nameArabic, meta.nameTranslit)
                : "";
            };
            const span =
              first && last
                ? first.surahNumber === last.surahNumber
                  ? nameOf(first.surahNumber)
                  : `${nameOf(first.surahNumber)} — ${nameOf(last.surahNumber)}`
                : "";
            return (
              <button
                key={j.juz}
                onClick={() => toggleJuz(j.juz)}
                className={`text-start rounded-2xl border p-3 transition active:scale-[0.97] ${
                  on
                    ? "border-transparent bg-primary text-white shadow-md"
                    : "border-border bg-surface hover:border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-bold">
                    {t("setup.juz")} {j.juz}
                  </span>
                  <span
                    className={`w-5 h-5 rounded-full grid place-items-center ${
                      on ? "bg-white/20" : "bg-surface-2"
                    }`}
                  >
                    {on && <Check size={12} strokeWidth={3} />}
                  </span>
                </div>
                <div
                  className={`text-[11px] leading-snug truncate ${
                    on ? "text-white/75" : "text-muted"
                  }`}
                >
                  {span}
                </div>
              </button>
            );
          })}
        </div>
      )}

    </div>
  );
}

function SurahGrid({
  surahs,
  emptyText,
  lang,
  selected,
  toggle,
  ayahsLabel,
}: {
  surahs: SurahMeta[];
  emptyText: string;
  lang: string;
  selected: Set<number>;
  toggle: (n: number) => void;
  ayahsLabel: string;
}) {
  if (surahs.length === 0)
    return <p className="text-sm text-muted text-center py-8">{emptyText}</p>;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2.5">
      {surahs.map((s) => {
        const on = selected.has(s.number);
        return (
          <button
            key={s.number}
            onClick={() => toggle(s.number)}
            className={`text-start rounded-2xl border p-3 transition active:scale-[0.98] ${
              on
                ? "border-primary/50 bg-primary-soft"
                : "border-border bg-surface hover:border-primary/30"
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[11px] text-muted">{s.number}</span>
              <span
                className={`w-5 h-5 rounded-full grid place-items-center transition ${
                  on ? "bg-primary text-white" : "bg-surface-2"
                }`}
              >
                {on && <Check size={12} strokeWidth={3} />}
              </span>
            </div>
            <div
              className={
                lang === "ar"
                  ? "text-[15px] font-bold leading-tight"
                  : "text-sm font-semibold leading-tight"
              }
            >
              {surahName(lang as "ar" | "en", s.nameArabic, s.nameTranslit)}
            </div>
            <div className="text-[11px] text-muted">
              {s.ayahCount} {ayahsLabel}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Loading() {
  return <PageLoader />;
}
