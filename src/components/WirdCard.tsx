"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, Play, Check, BookOpen } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import {
  loadWird,
  saveWird,
  isDoneToday,
  markDoneToday,
  currentStreak,
  type WirdConfig,
} from "@/lib/wird";

// The home hero, reference-style: badge pill → big title → progress bar →
// full-width pill CTA. Progress = position in the Mushaf (saved reading page).
export function WirdCard() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [cfg, setCfg] = useState<WirdConfig | null>(null);
  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [pagePos, setPagePos] = useState(1);

  function refresh() {
    setCfg(loadWird());
    setDone(isDoneToday());
    setStreak(currentStreak());
    try {
      setPagePos(Number(localStorage.getItem("aqim-quran-page")) || 1);
    } catch {}
  }
  useEffect(refresh, []);

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
  }

  // --- Not configured: same hero silhouette, soft wash, setup fields ------
  if (!cfg.enabled) {
    return (
      <section className="rounded-[1.75rem] bg-primary-soft p-6 space-y-4">
        <span className="inline-block rounded-full bg-surface px-3 py-1 text-[11px] font-bold text-primary">
          {t("wird.title")}
        </span>
        <h2 className="font-heading text-2xl font-bold leading-snug">
          {t("wird.start")}
        </h2>
        <p className="text-sm text-muted -mt-2">{t("wird.desc")}</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted text-xs">{t("wird.pages")}</span>
            <input
              type="number"
              min={1}
              max={20}
              value={cfg.pages}
              onChange={(e) =>
                apply({
                  ...cfg,
                  pages: Math.min(20, Math.max(1, Number(e.target.value) || 1)),
                })
              }
              className="w-16 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
            />
          </label>
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
        <button
          onClick={enable}
          className="btn-cta w-full !rounded-full py-3.5 text-base"
        >
          {t("wird.enable")}
        </button>
      </section>
    );
  }

  // --- Active hero ---------------------------------------------------------
  const progress = Math.min(1, pagePos / 604);
  const digits = (n: number) =>
    lang === "ar" ? String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]) : String(n);

  return (
    <section className="rounded-[1.75rem] bg-primary text-white p-6">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
            done ? "bg-white text-primary" : "bg-white/15 text-white"
          }`}
        >
          {done && <Check size={12} strokeWidth={3} />}
          {done ? t("wird.doneToday") : t("home.continueLabel")}
        </span>
        {streak > 0 && (
          <span className="flex items-center gap-1 text-xs font-bold text-white/90">
            <Flame size={14} className="text-accent" />
            {digits(streak)} {t("wird.streak")}
          </span>
        )}
      </div>

      <h2 className="font-heading text-2xl font-bold leading-snug mt-3">
        {done ? t("wird.doneToday") : t("wird.continue")}
      </h2>

      {/* Mushaf position */}
      <div className="mt-4">
        <div className="h-2 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${Math.max(2, progress * 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-white/60 mt-1.5">
          <span>
            {t("quran.page")} {digits(pagePos)} / {digits(604)}
          </span>
          <span>{Math.round(progress * 100)}٪</span>
        </div>
      </div>

      <button
        onClick={() => router.push("/quran")}
        className="mt-4 w-full rounded-full bg-accent text-white font-bold py-3.5 text-base flex items-center justify-center gap-2 shadow-sm hover:brightness-95 active:translate-y-px transition"
      >
        <Play size={17} className="rtl:-scale-x-100" />
        {t("home.continueLabel")} — {t("nav.quran")}
        <BookOpen size={17} />
      </button>

      <div className="flex items-center justify-between mt-3">
        <button
          onClick={() => {
            markDoneToday();
            refresh();
          }}
          disabled={done}
          className="text-xs font-bold text-white/80 hover:text-white disabled:opacity-50"
        >
          {done ? `✓ ${t("wird.doneToday")}` : t("wird.markDone")}
        </button>
        <button
          onClick={() => apply({ ...cfg, enabled: false })}
          className="text-[11px] text-white/50 hover:text-white/80"
        >
          {t("wird.disable")}
        </button>
      </div>
    </section>
  );
}
