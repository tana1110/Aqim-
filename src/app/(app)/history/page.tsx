"use client";

import { useEffect, useState } from "react";
import { Crosshair } from "lucide-react";
import { PageLoader } from "@/components/Brand";
import { GrowthChart, type GrowthPoint } from "@/components/GrowthChart";
import { useLang } from "@/components/LanguageProvider";
import { surahName } from "@/lib/quranDisplay";
import { defaultFocus, loadFocus, saveFocus, type FocusConfig } from "@/lib/focus";
import type { SurahMeta } from "@/lib/types";

interface MemoRange {
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
}

interface HistoryRow {
  id: number;
  prayerType: string;
  mode: string;
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
  usedAt: string;
}

export default function HistoryPage() {
  const { t, lang } = useLang();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [surahMap, setSurahMap] = useState<Map<number, SurahMeta>>(new Map());
  const [memo, setMemo] = useState<MemoRange[]>([]);
  const [juzList, setJuzList] = useState<{ juz: number; segments: MemoRange[] }[]>([]);
  const [growth, setGrowth] = useState<GrowthPoint[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/history").then((r) => r.json()),
      fetch("/api/surahs").then((r) => r.json()),
      fetch("/api/memorization").then((r) => r.json()),
      fetch("/api/juz").then((r) => r.json()),
      fetch("/api/memo-history").then((r) => r.json()),
    ])
      .then(([h, sur, m, j, g]) => {
        setRows(h.history ?? []);
        setSurahMap(
          new Map((sur.surahs ?? []).map((x: SurahMeta) => [x.number, x])),
        );
        setMemo(m.memorization ?? []);
        setJuzList(j.juz ?? []);
        setGrowth(g.points ?? []);
      })
      .finally(() => setLoaded(true));
  }, []);

  // Memorization summary (merged coverage — no double counting).
  const summary = (() => {
    const bySurah = new Map<number, [number, number][]>();
    for (const r of memo) {
      const l = bySurah.get(r.surahNumber) ?? [];
      l.push([r.fromAyah, r.toAyah]);
      bySurah.set(r.surahNumber, l);
    }
    const merged = new Map<number, [number, number][]>();
    for (const [n, list] of bySurah) {
      list.sort((a, b) => a[0] - b[0]);
      const out: [number, number][] = [];
      for (const iv of list) {
        const last = out[out.length - 1];
        if (last && iv[0] <= last[1] + 1) last[1] = Math.max(last[1], iv[1]);
        else out.push([...iv]);
      }
      merged.set(n, out);
    }
    const covered = (n: number, a: number, b: number) =>
      (merged.get(n) ?? []).some(([x, y]) => x <= a && b <= y);
    let totalAyat = 0;
    let fullSurahs = 0;
    for (const [n, list] of merged) {
      for (const [a, b] of list) totalAyat += b - a + 1;
      const count = surahMap.get(n)?.ayahCount;
      if (count && list.length === 1 && list[0][0] === 1 && list[0][1] >= count)
        fullSurahs++;
    }
    let fullJuz = 0;
    for (const j of juzList) {
      if (
        j.segments.length > 0 &&
        j.segments.every((seg) => covered(seg.surahNumber, seg.fromAyah, seg.toAyah))
      )
        fullJuz++;
    }
    return { totalAyat, fullSurahs, fullJuz };
  })();

  if (!loaded) return <PageLoader />;

  return (
    <div className="space-y-5 pt-2 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start lg:space-y-0">
      <div className="lg:col-span-2">
        <h1 className="text-xl font-bold mb-1">{t("history.title")}</h1>
        <p className="text-sm text-muted">{t("history.subtitle")}</p>
      </div>

      {/* Memorization summary + growth over time */}
      <div className="lg:col-span-2">
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
          {growth.length > 1 && (
            <div className="mt-4 pt-3 border-t border-border">
              <div className="text-xs font-bold text-muted mb-2">
                {t("setup.growth")}
              </div>
              <GrowthChart points={growth} ariaLabel={t("setup.growth")} />
            </div>
          )}
        </section>
      </div>

      <div>
        <div className="text-sm font-bold mb-2 px-1">{t("history.recent")}</div>
        {rows.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted">
            {t("history.empty")}
          </div>
        ) : (
          <div className="card divide-y divide-border overflow-hidden">
            {rows.map((r) => {
              const s = surahMap.get(r.surahNumber);
              const name = s
                ? surahName(lang, s.nameArabic, s.nameTranslit)
                : `${r.surahNumber}`;
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3.5 gap-3"
                >
                  <span
                    className="text-sm font-medium"
                  >
                    {name}{" "}
                    <span className="text-xs text-muted">
                      ({r.fromAyah}–{r.toAyah})
                    </span>
                  </span>
                  <span className="text-xs text-muted whitespace-nowrap">
                    {t(`prayer.${r.prayerType}`)} ·{" "}
                    {new Date(r.usedAt).toLocaleDateString(
                      lang === "ar" ? "ar" : "en",
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Focus mode — a secondary tool, collapsed below the history itself */}
      <div>
        <FocusPanel memo={memo} surahMap={surahMap} />
      </div>
    </div>
  );
}

// Temporary review spotlight: suggestions lean into the chosen surah/range
// without ever editing the permanent memorization record.
function FocusPanel({
  memo,
  surahMap,
}: {
  memo: MemoRange[];
  surahMap: Map<number, SurahMeta>;
}) {
  const { t, lang } = useLang();
  const [cfg, setCfg] = useState<FocusConfig | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const c = loadFocus();
    setCfg(c);
    setOpen(c.active); // an active focus is worth seeing at a glance
  }, []);

  if (!cfg) return null;

  // Memorized surahs (merged bounds per surah) as focus choices.
  const bySurah = new Map<number, { lo: number; hi: number }>();
  for (const r of memo) {
    const cur = bySurah.get(r.surahNumber);
    if (!cur) bySurah.set(r.surahNumber, { lo: r.fromAyah, hi: r.toAyah });
    else {
      cur.lo = Math.min(cur.lo, r.fromAyah);
      cur.hi = Math.max(cur.hi, r.toAyah);
    }
  }
  const choices = [...bySurah.keys()].sort((a, b) => a - b);

  function apply(next: FocusConfig) {
    setCfg(next);
    saveFocus(next);
  }

  const bounds = cfg.surahNumber ? bySurah.get(cfg.surahNumber) : null;
  const name = (n: number) => {
    const s = surahMap.get(n);
    return s ? surahName(lang, s.nameArabic, s.nameTranslit) : String(n);
  };

  // Collapsed: one summary row — the full form only on demand.
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="card w-full p-4 flex items-center justify-between gap-3 text-start active:scale-[0.99] transition"
      >
        <span className="text-sm font-bold flex items-center gap-1.5">
          <Crosshair size={15} className="text-primary" />
          {t("focus.title")}
        </span>
        <span
          className={`text-xs font-bold ${
            cfg.active ? "text-secondary" : "text-muted"
          }`}
        >
          {cfg.active && cfg.surahNumber
            ? `${t("focus.statusOn")} · ${name(cfg.surahNumber)}`
            : t("focus.statusOff")}
        </span>
      </button>
    );
  }

  // No memorization yet — the pickers would be empty; guide to setup instead.
  if (choices.length === 0) {
    return (
      <section className="card p-4 sm:p-5 space-y-3">
        <h2 className="text-sm font-bold flex items-center gap-1.5">
          <Crosshair size={15} className="text-primary" />
          {t("focus.title")}
        </h2>
        <p className="text-xs text-muted leading-relaxed">
          {t("focus.needMemo")}
        </p>
        <a href="/setup" className="btn-primary inline-block px-5 py-2 text-xs">
          {t("home.getStarted.btn")}
        </a>
      </section>
    );
  }

  return (
    <section className="card p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-1.5">
            <Crosshair size={15} className="text-primary" />
            {t("focus.title")}
          </h2>
          <p className="text-xs text-muted mt-1 leading-relaxed max-w-lg">
            {t("focus.desc")}
          </p>
        </div>
        {cfg.active && (
          <button
            onClick={() => apply({ ...cfg, active: false })}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted hover:text-foreground shrink-0"
          >
            {t("focus.disable")}
          </button>
        )}
      </div>

      {cfg.active && cfg.surahNumber ? (
        <div className="rounded-xl bg-primary-soft p-3.5 text-sm">
          {t("focus.active")}{" "}
          <b>
            {name(cfg.surahNumber)}
          </b>
          {cfg.fromAyah != null && cfg.toAyah != null && (
            <span className="text-muted">
              {" "}
              ({cfg.fromAyah}–{cfg.toAyah})
            </span>
          )}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Surah */}
        <label className="text-xs font-medium text-muted space-y-1.5 block">
          <span>{t("focus.surah")}</span>
          <select
            value={cfg.surahNumber ?? ""}
            onChange={(e) => {
              const n = Number(e.target.value) || null;
              const b = n ? bySurah.get(n) : null;
              apply({
                ...cfg,
                surahNumber: n,
                fromAyah: b ? b.lo : null,
                toAyah: b ? b.hi : null,
              });
            }}
            className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-sm text-foreground"
          >
            <option value="">{t("focus.pickSurah")}</option>
            {choices.map((n) => (
              <option key={n} value={n}>
                {name(n)}
              </option>
            ))}
          </select>
        </label>

        {/* Range */}
        <div className="text-xs font-medium text-muted space-y-1.5">
          <span>{t("focus.range")}</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={bounds?.lo ?? 1}
              max={bounds?.hi ?? 286}
              value={cfg.fromAyah ?? ""}
              placeholder={t("focus.from")}
              onChange={(e) =>
                apply({ ...cfg, fromAyah: Number(e.target.value) || null })
              }
              className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-sm text-foreground"
            />
            <span>–</span>
            <input
              type="number"
              min={bounds?.lo ?? 1}
              max={bounds?.hi ?? 286}
              value={cfg.toAyah ?? ""}
              placeholder={t("focus.to")}
              onChange={(e) =>
                apply({ ...cfg, toAyah: Number(e.target.value) || null })
              }
              className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-sm text-foreground"
            />
          </div>
        </div>
      </div>

      {/* Enable sits IMMEDIATELY under the pickers — visible the moment a
          surah is chosen, no scrolling needed. */}
      {!cfg.active && (
        <div className="space-y-1.5">
          <button
            onClick={() => cfg.surahNumber && apply({ ...cfg, active: true })}
            disabled={!cfg.surahNumber}
            className="btn-cta w-full sm:w-auto px-8 py-3 text-sm disabled:opacity-50"
          >
            {t("focus.enable")}
          </button>
          {!cfg.surahNumber && (
            <p className="text-[11px] text-muted">{t("focus.pickFirst")}</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* Intentional repetition */}
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={cfg.repeat}
            onChange={(e) => apply({ ...cfg, repeat: e.target.checked })}
            className="accent-[var(--color-primary)] w-4 h-4"
          />
          <span>{t("focus.repeat")}</span>
          <span className="text-[11px] text-muted hidden sm:inline">
            — {t("focus.repeat.hint")}
          </span>
        </label>

        {/* Ayat per passage */}
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted text-xs">{t("focus.chunk")}</span>
          <input
            type="number"
            min={1}
            max={30}
            value={cfg.chunk}
            onChange={(e) =>
              apply({
                ...cfg,
                chunk: Math.min(30, Math.max(1, Number(e.target.value) || 5)),
              })
            }
            className="w-16 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground"
          />
        </label>
      </div>

    </section>
  );
}

