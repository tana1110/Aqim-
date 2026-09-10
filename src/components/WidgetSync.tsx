"use client";

import { useEffect } from "react";
import { computeTimes, loadReminderConfig } from "@/lib/reminder";
import { loadTasbih } from "@/lib/tasbih";
import { adhkarPartsToday, isDoneToday, currentStreak } from "@/lib/wird";
import { pushWidgetData } from "@/lib/nativeBridge";

const PRAYER_LABEL: Record<string, { ar: string; en: string }> = {
  fajr: { ar: "الفجر", en: "Fajr" },
  dhuhr: { ar: "الظهر", en: "Dhuhr" },
  asr: { ar: "العصر", en: "Asr" },
  maghrib: { ar: "المغرب", en: "Maghrib" },
  isha: { ar: "العشاء", en: "Isha" },
};

function nextPrayer(): { label: string; time: string } | null {
  const cfg = loadReminderConfig();
  if (cfg.lat == null || cfg.lng == null) return null;
  const lang = (localStorage.getItem("aqim-lang") as "ar" | "en") || "ar";
  const now = new Date();
  const today = computeTimes(cfg.lat, cfg.lng, cfg.method, now);
  const tm = new Date();
  tm.setDate(tm.getDate() + 1);
  const tomorrow = computeTimes(cfg.lat, cfg.lng, cfg.method, tm);
  const nowMs = Date.now();
  for (const day of [today, tomorrow]) {
    for (const k of ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const) {
      if (day[k].getTime() > nowMs) {
        const time = new Intl.DateTimeFormat(lang === "ar" ? "ar-SA" : "en-US", {
          hour: "numeric",
          minute: "2-digit",
        }).format(day[k]);
        return { label: PRAYER_LABEL[k][lang], time };
      }
    }
  }
  return null;
}

function collect() {
  const parts = adhkarPartsToday();
  return {
    prayer: nextPrayer(),
    tasbih: (() => {
      const t = loadTasbih();
      return { phrase: t.phrase, count: t.count, target: t.target };
    })(),
    adhkar: parts,
    wird: { done: isDoneToday(), streak: currentStreak() },
  };
}

// No UI — just keeps the native home-screen widgets in sync whenever
// anything they show changes, or the app resumes.
export function WidgetSync() {
  useEffect(() => {
    const sync = () => {
      try {
        pushWidgetData(collect());
      } catch {}
    };
    sync();
    const iv = setInterval(sync, 60_000);
    window.addEventListener("aqim-wird-changed", sync);
    window.addEventListener("aqim-tasbih-changed", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(iv);
      window.removeEventListener("aqim-wird-changed", sync);
      window.removeEventListener("aqim-tasbih-changed", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  return null;
}
