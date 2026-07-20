"use client";

import { useEffect, useState } from "react";
import { Sparkles, Layers, BookMarked, Crosshair } from "lucide-react";
import { PageLoader } from "@/components/Brand";
import { useLang } from "@/components/LanguageProvider";
import { surahName } from "@/lib/quranDisplay";
import { defaultFocus, loadFocus, saveFocus, type FocusConfig } from "@/lib/focus";
import type { SurahMeta } from "@/lib/types";

interface MemoRange {
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
}

interface Stats {
  week: {
    totalRecitations: number;
    distinctPassages: number;
    distinctSurahs: number;
    bySurah: {
      surahNumber: number;
      count: number;
      nameEnglish: string;
      nameArabic: string;
    }[];
  };
  allTime: { totalRecitations: number; distinctPassages: number };
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
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [surahMap, setSurahMap] = useState<Map<number, SurahMeta>>(new Map());
  const [memo, setMemo] = useState<MemoRange[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/history/stats").then((r) => r.json()),
      fetch("/api/history").then((r) => r.json()),
      fetch("/api/surahs").then((r) => r.json()),
      fetch("/api/memorization").then((r) => r.json()),
    ])
      .then(([s, h, sur, m]) => {
        setStats(s);
        setRows(h.history ?? []);
        setSurahMap(
          new Map((sur.surahs ?? []).map((x: SurahMeta) => [x.number, x])),
        );
        setMemo(m.memorization ?? []);
      })
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return <PageLoader />;

  return (
    <div className="space-y-5 pt-2 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start lg:space-y-0">
      <div className="lg:col-span-2">
        <h1 className="text-xl font-bold mb-1">{t("history.title")}</h1>
        <p className="text-sm text-muted">{t("history.subtitle")}</p>
      </div>

      {/* Focus mode — active memorization-review tool */}
      <div className="lg:col-span-2">
        <FocusPanel memo={memo} surahMap={surahMap} />
      </div>

      {stats && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2.5">
            <Stat
              Icon={Sparkles}
              label={t("history.week")}
              value={stats.week.totalRecitations}
            />
            <Stat
              Icon={Layers}
              label={t("history.distinctPassages")}
              value={stats.week.distinctPassages}
            />
            <Stat
              Icon={BookMarked}
              label={t("history.distinctSurahs")}
              value={stats.week.distinctSurahs}
            />
          </div>

          {stats.week.bySurah.length > 0 && (
            <div className="card p-4">
              <div className="text-sm font-bold mb-3">
                {t("history.mostRepeated")}
              </div>
              <div className="space-y-2.5">
                {stats.week.bySurah.map((b) => (
                  <div key={b.surahNumber} className="flex items-center gap-3">
                    <span
                      className={`w-24 truncate ${lang === "ar" ? "font-quran text-base" : "text-sm font-medium"}`}
                    >
                      {surahName(lang, b.nameArabic, b.nameEnglish)}
                    </span>
                    <div className="flex-1 h-2.5 rounded-full bg-surface-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-secondary"
                        style={{
                          width: `${
                            (b.count / Math.max(1, stats.week.bySurah[0].count)) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted w-5 text-end tabular-nums">
                      {b.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
                    className={lang === "ar" ? "font-quran text-base" : "text-sm font-medium"}
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

  useEffect(() => {
    setCfg(loadFocus());
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
          <b className={lang === "ar" ? "font-quran text-base" : ""}>
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

      {!cfg.active && (
        <button
          onClick={() => cfg.surahNumber && apply({ ...cfg, active: true })}
          disabled={!cfg.surahNumber}
          className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50"
        >
          {t("focus.enable")}
        </button>
      )}
    </section>
  );
}

function Stat({
  Icon,
  label,
  value,
}: {
  Icon: typeof Sparkles;
  label: string;
  value: number;
}) {
  return (
    <div className="card p-3.5 text-center">
      <Icon size={18} className="text-primary mx-auto mb-1.5" />
      <div className="text-2xl font-bold text-foreground tabular-nums">
        {value}
      </div>
      <div className="text-[10px] text-muted mt-0.5 leading-tight">{label}</div>
    </div>
  );
}
