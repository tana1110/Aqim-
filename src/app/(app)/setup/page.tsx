"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { LogoLoader } from "@/components/Logo";
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

export default function SetupPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [juzList, setJuzList] = useState<Juz[]>([]);
  const [selectedSurahs, setSelectedSurahs] = useState<Set<number>>(new Set());
  const [selectedJuz, setSelectedJuz] = useState<Set<number>>(new Set());
  const [tab, setTab] = useState<"surah" | "juz">("surah");
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
    const fullSurahs = new Set(selectedSurahs);
    const ranges: JuzSegment[] = [];
    for (const n of fullSurahs) {
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
        if (fullSurahs.has(seg.surahNumber)) continue;
        ranges.push(seg);
      }
    }
    return ranges;
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
      {transitioning && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background">
          <div className="flex flex-col items-center gap-5">
            <div className="animate-splash-pop text-primary">
              <LogoLoader size={112} />
            </div>
            <span className="font-heading text-4xl text-primary animate-splash-rise">
              أقِم
            </span>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold mb-1">{t("setup.title")}</h1>
        <p className="text-sm text-muted">{t("setup.subtitle")}</p>
      </div>

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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2.5">
          {surahs.map((s) => {
            const on = selectedSurahs.has(s.number);
            return (
              <button
                key={s.number}
                onClick={() => toggleSurah(s.number)}
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
                  {surahName(lang, s.nameArabic, s.nameTranslit)}
                </div>
                <div className="text-[11px] text-muted">
                  {s.ayahCount} {t("setup.ayahs")}
                </div>
              </button>
            );
          })}
        </div>
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

      <div className="fixed inset-x-0 bottom-24 z-20 px-4 md:static md:px-0 md:mt-2">
        <div className="mx-auto max-w-md md:max-w-none card flex items-center justify-between gap-3 p-2.5 pr-4">
          <span className="text-sm text-muted">
            {selectedCount > 0
              ? t("setup.selected", { n: selectedCount })
              : t("setup.noneSelected")}
          </span>
          <button
            onClick={save}
            disabled={saving}
            className="btn-primary px-6 py-2.5 text-sm flex items-center gap-1.5 disabled:opacity-70"
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
      <div className="h-12 md:hidden" />
    </div>
  );
}

function Loading() {
  return (
    <div className="space-y-3 pt-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-16 rounded-2xl bg-surface-2 animate-pulse" />
      ))}
    </div>
  );
}
