"use client";

import { useEffect, useState } from "react";
import { Flame, Check, Bell } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import {
  loadWird,
  saveWird,
  isDoneToday,
  markDoneToday,
  currentStreak,
  type WirdConfig,
} from "@/lib/wird";

// Slim wird strip — lives on the QURAN page (the wird is a reading habit).
// Off: one collapsed row that expands into the tiny setup form.
// On: streak flame + a mark-done chip. Never a hero, never shouting.
export function WirdStrip() {
  const { t } = useLang();
  const [cfg, setCfg] = useState<WirdConfig | null>(null);
  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [openSetup, setOpenSetup] = useState(false);

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

  if (!cfg.enabled) {
    return (
      <div className="card rounded-xl px-4 py-3">
        <button
          onClick={() => setOpenSetup(!openSetup)}
          className="w-full flex items-center justify-between gap-3 text-sm"
        >
          <span className="flex items-center gap-2 font-medium">
            <Bell size={15} className="text-muted" />
            {t("wird.start")}
          </span>
          <span className="text-xs text-primary font-bold">
            {openSetup ? "×" : "+"}
          </span>
        </button>
        {openSetup && (
          <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-3">
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
                className="w-14 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
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
            <button onClick={enable} className="btn-primary px-4 py-1.5 text-xs ms-auto">
              {t("wird.enable")}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card rounded-xl px-4 py-3 flex items-center justify-between gap-3">
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
        <button
          onClick={() => {
            markDoneToday();
            refresh();
          }}
          disabled={done}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition ${
            done
              ? "bg-secondary text-white"
              : "btn-accent !rounded-full"
          } disabled:opacity-90`}
        >
          {done ? <Check size={14} /> : t("adhkar.done")}
        </button>
        <button
          onClick={() => apply({ ...cfg, enabled: false })}
          className="text-[10px] text-muted hover:text-foreground"
        >
          {t("wird.disable")}
        </button>
      </span>
    </div>
  );
}
