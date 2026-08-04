"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Crosshair } from "lucide-react";
import { PageLoader } from "@/components/Brand";
import { GrowthChart, type GrowthPoint } from "@/components/GrowthChart";
import { PassageCard } from "@/components/PassageCard";
import { useLang } from "@/components/LanguageProvider";
import { surahName } from "@/lib/quranDisplay";
import { defaultFocus, loadFocus, saveFocus, type FocusConfig } from "@/lib/focus";
import type { PassageContent, SurahMeta } from "@/lib/types";

interface MemoRange {
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
}

// Local calendar keys for day grouping.
function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const todayKey = () => localDayKey(new Date());
function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDayKey(d);
}
function groupByDay(rows: HistoryRow[]): { key: string; rows: HistoryRow[] }[] {
  const sorted = [...rows].sort(
    (a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime(),
  );
  const groups: { key: string; rows: HistoryRow[] }[] = [];
  for (const r of sorted) {
    const key = localDayKey(new Date(r.usedAt));
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.rows.push(r);
    else groups.push({ key, rows: [r] });
  }
  return groups;
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
  const [tab, setTab] = useState<"recitations" | "memo">("recitations");
  const [loadFailed, setLoadFailed] = useState(false);

  // Paint instantly from the last visit's snapshot; refresh silently.
  useLayoutEffect(() => {
    try {
      const raw = sessionStorage.getItem("aqim-c:history");
      if (raw) {
        const c = JSON.parse(raw);
        if (!Array.isArray(c.rows) || !Array.isArray(c.surahs)) return;
        setRows(c.rows ?? []);
        setSurahMap(
          new Map((c.surahs ?? []).map((x: SurahMeta) => [x.number, x])),
        );
        setMemo(c.memo ?? []);
        setJuzList(c.juz ?? []);
        setGrowth(c.growth ?? []);
        setLoaded(true);
      }
    } catch {}
  }, []);

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
        try {
          sessionStorage.setItem(
            "aqim-c:history",
            JSON.stringify({
              rows: h.history ?? [],
              surahs: sur.surahs ?? [],
              memo: m.memorization ?? [],
              juz: j.juz ?? [],
              growth: g.points ?? [],
            }),
          );
        } catch {}
      })
      .catch(() => setLoadFailed(true))
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
    <div className="space-y-5 pt-2 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold mb-1">{t("history.title")}</h1>
        <p className="text-sm text-muted">{t("history.subtitle")}</p>
      </div>

      {/* Two clear worlds: what I recited, and my memorization journey */}
      <div className="flex gap-2 p-1 bg-surface-2 rounded-2xl">
        {(["recitations", "memo"] as const).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`flex-1 rounded-xl py-2 text-sm font-bold transition ${
              tab === tb ? "bg-surface text-primary shadow-sm" : "text-muted"
            }`}
          >
            {t(`history.tab.${tb}`)}
          </button>
        ))}
      </div>

      {tab === "recitations" ? (
        rows.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted space-y-3">
            <p>{loadFailed ? t("common.loadFailed") : t("history.empty")}</p>
            {loadFailed && (
              <button
                onClick={() => window.location.reload()}
                className="btn-primary px-6 py-2 text-sm"
              >
                {t("common.retry")}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px] text-muted px-1">{t("history.tapToSee")}</p>
            {groupByDay(rows).map((g) => (
              <div key={g.key}>
                <div className="text-[11px] font-bold text-muted mb-1.5 px-1">
                  {g.key === todayKey()
                    ? t("history.today")
                    : g.key === yesterdayKey()
                      ? t("history.yesterday")
                      : new Date(g.rows[0].usedAt).toLocaleDateString(
                          lang === "ar" ? "ar" : "en",
                          { weekday: "long", day: "numeric", month: "long" },
                        )}
                </div>
                <div className="card divide-y divide-border overflow-hidden">
                  {g.rows.map((r) => {
                    const su = surahMap.get(r.surahNumber);
                    const name = su
                      ? surahName(lang, su.nameArabic, su.nameTranslit)
                      : `${r.surahNumber}`;
                    return <RecitationRow key={r.id} r={r} name={name} />;
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          {/* Memorization summary + growth over time */}
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

          {/* Review focus lives with the memorization story */}
          <FocusPanel memo={memo} surahMap={surahMap} />
        </>
      )}
    </div>
  );
}

// One recitation — tap to reveal the exact ayat that were recited (verified
// local text via /api/passage), tap again to fold them away.
function RecitationRow({ r, name }: { r: HistoryRow; name: string }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<PassageContent | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!open && !content && !busy) {
      setBusy(true);
      try {
        const res = await fetch(
          `/api/passage?surah=${r.surahNumber}&from=${r.fromAyah}&to=${r.toAyah}`,
        );
        const d = await res.json();
        setContent(d.content ?? null);
      } catch {
      } finally {
        setBusy(false);
      }
    }
    setOpen((o) => !o);
  }

  return (
    <div>
      <button
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between p-3.5 gap-3 text-start hover:bg-surface-2 transition"
      >
        <span className="text-sm font-medium min-w-0 truncate">
          {name}{" "}
          <span className="text-xs text-muted">
            ({r.fromAyah}–{r.toAyah})
          </span>
        </span>
        <span className="flex items-center gap-2 text-xs text-muted whitespace-nowrap shrink-0">
          {t(`prayer.${r.prayerType}`)}
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px]">
            {t(`mode.${r.mode}`)}
          </span>
          <ChevronDown
            size={14}
            className={`transition-transform ${open ? "rotate-180" : ""} ${busy ? "animate-pulse" : ""}`}
          />
        </span>
      </button>
      {open && content && (
        <div className="px-3 pb-4">
          <PassageCard content={content} />
        </div>
      )}
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

  // Visible validation instead of silently rewriting what the user typed.
  const rangeErr = (() => {
    if (!bounds || cfg.fromAyah == null || cfg.toAyah == null) return null;
    if (cfg.fromAyah < bounds.lo || cfg.toAyah > bounds.hi)
      return t("focus.rangeErr", { a: bounds.lo, b: bounds.hi });
    if (cfg.fromAyah > cfg.toAyah) return t("focus.orderErr");
    return null;
  })();
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
        <Link href="/setup" className="btn-primary inline-block px-5 py-2 text-xs">
          {t("home.getStarted.btn")}
        </Link>
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
          {rangeErr && (
            <p className="text-[11px] text-accent font-medium">{rangeErr}</p>
          )}
        </div>
      </div>

      {/* Enable sits IMMEDIATELY under the pickers — visible the moment a
          surah is chosen, no scrolling needed. */}
      {!cfg.active && (
        <div className="space-y-1.5">
          <button
            onClick={() =>
              cfg.surahNumber && !rangeErr && apply({ ...cfg, active: true })
            }
            disabled={!cfg.surahNumber || !!rangeErr}
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

