"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Search } from "lucide-react";
import { BrandOverlay, PageLoader } from "@/components/Brand";
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
  const [transitioning, setTransitioning] = useState(false);
  const [seeded, setSeeded] = useState(true);

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
      const preselect = new Set<number>();
      for (const r of mRes.memorization ?? []) {
        const meta = byNumber.get(r.surahNumber);
        if (meta && r.fromAyah === 1 && r.toAyah >= meta.ayahCount) {
          preselect.add(r.surahNumber);
        }
      }
      setSelectedSurahs(preselect);
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
    setSelectedJuz((prev) => {
      const next = new Set(prev);
      next.has(j) ? next.delete(j) : next.add(j);
      return next;
    });
  }

  function buildRanges(): JuzSegment[] {
    return buildRangesFrom(selectedSurahs, selectedJuz, juzList, ayahCountBySurah);
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/memorization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ranges: buildRanges() }),
      });
      // Brief brand transition, then the home screen.
      setTransitioning(true);
      setTimeout(() => router.push("/home"), 2000);
    } catch {
      setSaving(false);
    }
  }

  const selectedCount = selectedSurahs.size + selectedJuz.size;

  // Live summary of the current selection: full surahs, complete juz, total
  // ayat — computed from merged coverage so overlaps never double-count.
  const summary = useMemo(() => {
    const ranges = buildRangesFrom(
      selectedSurahs,
      selectedJuz,
      juzList,
      ayahCountBySurah,
    );
    const bySurah = new Map<number, [number, number][]>();
    for (const r of ranges) {
      const list = bySurah.get(r.surahNumber) ?? [];
      list.push([r.fromAyah, r.toAyah]);
      bySurah.set(r.surahNumber, list);
    }
    // merge intervals per surah
    const merged = new Map<number, [number, number][]>();
    for (const [s, list] of bySurah) {
      list.sort((a, b) => a[0] - b[0]);
      const out: [number, number][] = [];
      for (const iv of list) {
        const last = out[out.length - 1];
        if (last && iv[0] <= last[1] + 1) last[1] = Math.max(last[1], iv[1]);
        else out.push([...iv]);
      }
      merged.set(s, out);
    }
    const covered = (s: number, from: number, to: number) =>
      (merged.get(s) ?? []).some(([a, b]) => a <= from && to <= b);

    let totalAyat = 0;
    let fullSurahs = 0;
    for (const [s, list] of merged) {
      for (const [a, b] of list) totalAyat += b - a + 1;
      const count = ayahCountBySurah.get(s);
      if (count && list.length === 1 && list[0][0] === 1 && list[0][1] >= count)
        fullSurahs++;
    }
    let fullJuz = 0;
    for (const j of juzList) {
      if (
        j.segments.length > 0 &&
        j.segments.every((seg) =>
          covered(seg.surahNumber, seg.fromAyah, seg.toAyah),
        )
      )
        fullJuz++;
    }
    return { totalAyat, fullSurahs, fullJuz };
  }, [selectedSurahs, selectedJuz, juzList, ayahCountBySurah]);

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
      {/* Post-save brand transition (~2s) before the dashboard */}
      {transitioning && <BrandOverlay />}

      <div>
        <h1 className="text-xl font-bold mb-1">{t("setup.title")}</h1>
        <p className="text-sm text-muted">{t("setup.subtitle")}</p>
      </div>

      {/* Save bar — appears AT THE TOP the moment anything is selected and
          stays stuck under the header while scrolling. In normal flow, so it
          never covers the last rows of the list. */}
      {selectedCount > 0 && (
        <div className="sticky top-[64px] z-10 animate-rise">
          <div className="card flex items-center justify-between gap-3 p-2.5 ps-4 shadow-lg">
            <span className="text-sm font-medium">
              {t("setup.selected", { n: selectedCount })}
            </span>
            <button
              onClick={save}
              disabled={saving}
              className="btn-cta px-8 py-2.5 text-sm flex items-center gap-1.5 disabled:opacity-70"
            >
              {saving ? (
                <>
                  <Check size={16} /> {t("common.saved")}
                </>
              ) : (
                t("common.save")
              )}
            </button>
          </div>
        </div>
      )}

      {/* Live summary of the memorization (updates as you toggle) */}
      <section className="card p-4">
        <div className="text-xs font-bold text-muted mb-3">
          {t("setup.summary")}
        </div>
        <div className="grid grid-cols-3 divide-x divide-border rtl:divide-x-reverse text-center">
          <div className="px-2">
            <div className="text-2xl font-bold text-primary tabular-nums">
              {summary.fullSurahs}
            </div>
            <div className="text-[10px] text-muted mt-0.5">
              {t("setup.fullSurahs")}
            </div>
          </div>
          <div className="px-2">
            <div className="text-2xl font-bold text-primary tabular-nums">
              {summary.fullJuz}
              <span className="text-sm text-muted font-normal"> / 30</span>
            </div>
            <div className="text-[10px] text-muted mt-0.5">
              {t("setup.fullJuz")}
            </div>
          </div>
          <div className="px-2">
            <div className="text-2xl font-bold text-primary tabular-nums">
              {summary.totalAyat}
            </div>
            <div className="text-[10px] text-muted mt-0.5">
              {t("setup.totalAyat")}
            </div>
          </div>
        </div>
      </section>

      <div className="flex gap-2 p-1 bg-surface-2 rounded-2xl">
        {(["surah", "juz"] as const).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`flex-1 rounded-xl py-2 text-sm font-bold transition ${
              tab === tb ? "bg-surface text-primary shadow-sm" : "text-muted"
            }`}
          >
            {tb === "surah" ? t("setup.bySurah") : t("setup.byJuz")}
          </button>
        ))}
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
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10 gap-2.5">
          {juzList.map((j) => {
            const on = selectedJuz.has(j.juz);
            return (
              <button
                key={j.juz}
                onClick={() => toggleJuz(j.juz)}
                className={`aspect-square rounded-2xl border grid place-items-center transition active:scale-[0.95] ${
                  on
                    ? "border-transparent bg-primary text-white shadow-md"
                    : "border-border bg-surface hover:border-primary/30"
                }`}
              >
                <div className="text-center leading-tight">
                  <div className="text-[9px] opacity-70">{t("setup.juz")}</div>
                  <div className="text-lg font-bold">{j.juz}</div>
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
                  ? "font-quran text-lg leading-tight"
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
