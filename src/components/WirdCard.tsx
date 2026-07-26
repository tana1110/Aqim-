"use client";

import { useEffect, useState } from "react";
import { Flame, Check, Bell, ChevronDown } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { surahName } from "@/lib/quranDisplay";
import {
  loadWird,
  saveWird,
  isDoneToday,
  markDoneToday,
  currentStreak,
  pagesReadToday,
  surahWirdProgress,
  wirdWeek,
  adhkarWeek,
  type WirdConfig,
  type WirdMode,
} from "@/lib/wird";
import type { SurahMeta } from "@/lib/types";

// Daily wird — configured and lived on the QURAN page. Portion can be defined
// by pages, by a surah, or by minutes of reading; shows the next reminder,
// the streak, and a weekly tracker for both wird and adhkar.
export function WirdStrip() {
  const { t, lang } = useLang();
  const [cfg, setCfg] = useState<WirdConfig | null>(null);
  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [weeks, setWeeks] = useState<{ wird: boolean[]; adhkar: boolean[] }>();
  const [openSetup, setOpenSetup] = useState(false);
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [surahQuery, setSurahQuery] = useState("");

  const [pagesToday, setPagesToday] = useState(0);

  function refresh() {
    setCfg(loadWird());
    setDone(isDoneToday());
    setStreak(currentStreak());
    setPagesToday(pagesReadToday());
    setWeeks({ wird: wirdWeek(), adhkar: adhkarWeek() });
  }
  useEffect(() => {
    refresh();
    window.addEventListener("aqim-wird-changed", refresh);
    return () => window.removeEventListener("aqim-wird-changed", refresh);
  }, []);

  useEffect(() => {
    if ((openSetup || cfg?.mode === "surah") && surahs.length === 0) {
      fetch("/api/surahs")
        .then((r) => r.json())
        .then((d) => setSurahs(d.surahs ?? []))
        .catch(() => {});
    }
  }, [openSetup, cfg?.mode, surahs.length]);

  if (!cfg) return null;

  function apply(next: WirdConfig) {
    saveWird(next);
    refresh();
  }

  async function enable() {
    try {
      if (
        typeof Notification !== "undefined" &&
        Notification.permission !== "granted"
      ) {
        await Notification.requestPermission();
      }
    } catch {}
    apply({ ...cfg!, enabled: true });
    setOpenSetup(false);
  }

  const modeField = (c: WirdConfig) => {
    if (c.mode === "pages")
      return (
        <div className="w-full space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted text-xs">{t("wird.pages")}</span>
            <input
              type="number"
              min={1}
              max={30}
              value={c.pages}
              onChange={(e) =>
                apply({
                  ...c,
                  pages: Math.min(30, Math.max(1, Number(e.target.value) || 1)),
                })
              }
              className="w-14 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
            />
          </label>
          {/* Khatmah shortcuts: pick a finish-line, we compute the pace */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: "wird.k30", pages: Math.ceil(604 / 30) },
              { key: "wird.k60", pages: Math.ceil(604 / 60) },
            ].map((k) => (
              <button
                key={k.key}
                onClick={() => apply({ ...c, pages: k.pages })}
                className={`rounded-full px-3 py-1 text-[11px] font-bold border transition ${
                  c.pages === k.pages
                    ? "border-transparent bg-primary text-white"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {t(k.key)}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted">
            {t("wird.khatmahIn", {
              n: c.pages,
              d: Math.ceil(604 / c.pages),
            })}
          </p>
        </div>
      );
    if (c.mode === "minutes")
      return (
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted text-xs">{t("wird.minutes")}</span>
          <input
            type="number"
            min={5}
            max={180}
            step={5}
            value={c.minutes}
            onChange={(e) =>
              apply({
                ...c,
                minutes: Math.min(180, Math.max(5, Number(e.target.value) || 15)),
              })
            }
            className="w-16 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
          />
        </label>
      );
    // MULTIPLE surahs at once: a searchable checklist — tap to toggle.
    const strip = (x: string) => x.normalize("NFC").replace(/\p{M}/gu, "");
    const query = strip(surahQuery.trim().toLowerCase());
    const list = surahs.filter((s) => {
      if (!query) return true;
      return (
        strip(s.nameArabic).includes(query) ||
        s.nameTranslit.toLowerCase().includes(query) ||
        String(s.number) === query
      );
    });
    const toggle = (n: number) =>
      apply({
        ...c,
        surahNumbers: c.surahNumbers.includes(n)
          ? c.surahNumbers.filter((x) => x !== n)
          : [...c.surahNumbers, n],
      });
    return (
      <div className="w-full space-y-2">
        {c.surahNumbers.length > 0 && (
          <div className="text-[11px] font-bold text-primary">
            {t("wird.pickedCount", { n: c.surahNumbers.length })}
          </div>
        )}
        <input
          type="search"
          value={surahQuery}
          onChange={(e) => setSurahQuery(e.target.value)}
          placeholder={t("setup.search")}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <div className="max-h-52 overflow-y-auto rounded-xl border border-border divide-y divide-border">
          {list.map((s) => {
            const on = c.surahNumbers.includes(s.number);
            return (
              <button
                key={s.number}
                onClick={() => toggle(s.number)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-start text-sm ${
                  on ? "bg-primary-soft text-primary font-bold" : ""
                }`}
              >
                <span>
                  {s.number}. {surahName(lang, s.nameArabic, s.nameTranslit)}
                </span>
                <span
                  className={`w-5 h-5 rounded-full grid place-items-center shrink-0 ${
                    on ? "bg-primary text-white" : "bg-surface-2"
                  }`}
                >
                  {on && <Check size={12} strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted leading-relaxed">
          {t("wird.readToComplete")}
        </p>
      </div>
    );
  };

  const setupForm = (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      {/* Mode: pages / surah / minutes */}
      <div className="inline-flex items-center rounded-lg border border-border bg-surface p-0.5 text-xs font-bold">
        {(["pages", "surah", "minutes"] as WirdMode[]).map((m) => (
          <button
            key={m}
            onClick={() => apply({ ...cfg, mode: m })}
            aria-pressed={cfg.mode === m}
            className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
              cfg.mode === m
                ? "bg-primary text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t(`wird.mode.${m}`)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {modeField(cfg)}
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted text-xs">{t("wird.time")}</span>
          <input
            type="time"
            value={cfg.time}
            onChange={(e) => apply({ ...cfg, time: e.target.value || "20:00" })}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      {!cfg.enabled && (
        <button onClick={enable} className="btn-cta w-full py-2.5 text-sm">
          {t("wird.begin")}
        </button>
      )}
    </div>
  );

  // Weekly tracker: one dot per day (oldest→today), a row each for wird+adhkar.
  const WeekRow = ({ label, days }: { label: string; days: boolean[] }) => (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-muted w-14">{label}</span>
      <span className="flex items-center gap-1.5">
        {days.map((d, i) => (
          <span
            key={i}
            className={`w-4 h-4 rounded-full grid place-items-center ${
              d
                ? "bg-secondary text-white"
                : "bg-surface-2 border border-border"
            }`}
          >
            {d && <Check size={10} strokeWidth={3.5} />}
          </span>
        ))}
      </span>
    </div>
  );

  if (!cfg.enabled) {
    return (
      <div className="card rounded-xl px-4 py-3">
        <button
          onClick={() => setOpenSetup(!openSetup)}
          aria-expanded={openSetup}
          className="w-full flex items-center justify-between gap-3 text-sm"
        >
          <span className="flex items-center gap-2 font-medium">
            <Bell size={15} className="text-muted" />
            {t("wird.start")}
          </span>
          <span className="w-8 h-8 grid place-items-center rounded-full text-primary">
            <ChevronDown
              size={17}
              className={`transition-transform ${openSetup ? "rotate-180" : ""}`}
            />
          </span>
        </button>
        {!openSetup && (
          <p className="text-[11px] text-muted mt-1 leading-relaxed">
            {t("wird.explain")}
          </p>
        )}
        {openSetup && setupForm}
      </div>
    );
  }

  return (
    <div className="card rounded-xl px-4 py-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium min-w-0">
          {streak > 0 && (
            <span className="flex items-center gap-1 text-accent font-bold shrink-0">
              <Flame size={15} />
              {streak}
            </span>
          )}
          <span className="truncate">
            {done ? t("wird.doneToday") : t("home.todo.wird")}
          </span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {/* Surah mode has NO manual check — it completes only by actually
              finishing the reading in the Mushaf. */}
          {(cfg.mode !== "surah" || done) && (
            <button
              onClick={() => {
                markDoneToday();
                refresh();
              }}
              disabled={done || cfg.mode === "surah"}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition ${
                done ? "bg-secondary text-white" : "btn-accent !rounded-full"
              } disabled:opacity-90`}
            >
              {done ? <Check size={14} /> : t("adhkar.done")}
            </button>
          )}
          <button
            onClick={() => setOpenSetup(!openSetup)}
            className="text-[10px] text-muted hover:text-foreground"
          >
            {openSetup ? "×" : t("nav.settings")}
          </button>
        </span>
      </div>

      {/* Live reading progress (pages mode) — filled by the Mushaf itself */}
      {cfg.mode === "pages" && !done && (
        <div className="text-[11px] text-muted">
          {t("wird.todayPages", {
            n: Math.min(pagesToday, cfg.pages),
            m: cfg.pages,
          })}
          <span className="block h-1 rounded-full bg-surface-2 overflow-hidden mt-1">
            <span
              className="block h-full rounded-full bg-secondary transition-all"
              style={{
                width: `${Math.min(100, (pagesToday / cfg.pages) * 100)}%`,
              }}
            />
          </span>
        </div>
      )}

      {/* Surah mode: the reading line itself — done only when it's full */}
      {cfg.mode === "surah" &&
        !done &&
        (() => {
          const prog = surahWirdProgress(surahs);
          if (prog.total === 0) return null;
          return (
            <div className="text-[11px] text-muted">
              {t("wird.surahProgress", { n: prog.read, m: prog.total })}
              <span className="block h-1 rounded-full bg-surface-2 overflow-hidden mt-1">
                <span
                  className="block h-full rounded-full bg-secondary transition-all"
                  style={{ width: `${(prog.read / prog.total) * 100}%` }}
                />
              </span>
            </div>
          );
        })()}

      {/* Next reminder + weekly trackers */}
      <div className="flex items-center justify-between gap-3 text-[11px] text-muted">
        <span>
          {t("wird.nextAt")}: {cfg.time}
        </span>
        <button
          onClick={() => apply({ ...cfg, enabled: false })}
          className="hover:text-foreground"
        >
          {t("wird.disable")}
        </button>
      </div>
      {weeks && (
        <div className="space-y-1.5 pt-2 border-t border-border">
          <WeekRow label={t("wird.weekWird")} days={weeks.wird} />
          <WeekRow label={t("wird.weekAdhkar")} days={weeks.adhkar} />
        </div>
      )}
      {openSetup && setupForm}
    </div>
  );
}
