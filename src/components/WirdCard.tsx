"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, BookOpen, Check } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import {
  loadWird,
  saveWird,
  isDoneToday,
  markDoneToday,
  currentStreak,
  type WirdConfig,
} from "@/lib/wird";

// The "continue" hero: configure the daily wird, then live with a streak,
// a jump-back-into-reading action, and a mark-done button.
export function WirdCard() {
  const { t } = useLang();
  const [cfg, setCfg] = useState<WirdConfig | null>(null);
  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState(0);

  function refresh() {
    setCfg(loadWird());
    setDone(isDoneToday());
    setStreak(currentStreak());
  }
  useEffect(refresh, []);

  if (!cfg) return null;

  function apply(next: WirdConfig) {
    saveWird(next);
    refresh();
  }

  async function enable() {
    try {
      if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
        await Notification.requestPermission();
      }
    } catch {}
    apply({ ...cfg!, enabled: true });
  }

  // --- Not configured yet: compact setup form -----------------------------
  if (!cfg.enabled) {
    return (
      <section className="card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-1.5">
            <BookOpen size={15} className="text-primary" />
            {t("wird.title")}
          </h2>
          <p className="text-xs text-muted mt-1">{t("wird.desc")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted text-xs">{t("wird.pages")}</span>
            <input
              type="number"
              min={1}
              max={20}
              value={cfg.pages}
              onChange={(e) =>
                apply({ ...cfg, pages: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })
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
        <button onClick={enable} className="btn-cta w-full sm:w-auto px-8 py-3 text-sm">
          {t("wird.enable")}
        </button>
      </section>
    );
  }

  // --- Active: the continue hero ------------------------------------------
  return (
    <section className="card overflow-hidden">
      <div className="p-5 bg-primary-soft">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-muted">
            {t("home.continueLabel")}
          </span>
          {streak > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold text-accent">
              <Flame size={14} />
              {streak} {t("wird.streak")}
            </span>
          )}
        </div>
        <h2 className="font-heading text-xl font-bold mt-1">
          {done ? t("wird.doneToday") : t("wird.continue")}
        </h2>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link
            href="/quran"
            className="btn-primary px-5 py-2.5 text-sm flex items-center gap-1.5"
          >
            <BookOpen size={15} />
            {t("nav.quran")}
          </Link>
          <button
            onClick={() => {
              markDoneToday();
              refresh();
            }}
            disabled={done}
            className={`px-5 py-2.5 text-sm font-bold flex items-center gap-1.5 rounded-lg transition ${
              done
                ? "bg-secondary-soft text-secondary border border-secondary/40"
                : "btn-accent"
            }`}
          >
            {done ? (
              <>
                <Check size={15} /> {t("wird.doneToday")}
              </>
            ) : (
              t("wird.markDone")
            )}
          </button>
          <button
            onClick={() => apply({ ...cfg, enabled: false })}
            className="px-3 py-2.5 text-xs text-muted hover:text-foreground"
          >
            {t("wird.disable")}
          </button>
        </div>
      </div>
    </section>
  );
}
