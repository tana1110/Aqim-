"use client";

import { useEffect } from "react";
import { computeTimes, loadReminderConfig } from "@/lib/reminder";
import { translate, type Lang } from "@/lib/i18n";

const LEAD_MS = 5 * 60 * 1000; // notify 5 minutes before the prayer

// Invisible client that (re)schedules prayer notifications while the app runs.
// Everything is computed on-device; nothing is sent anywhere.
export function ReminderScheduler() {
  useEffect(() => {
    // Register the service worker (also used for notification display).
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    let timers: ReturnType<typeof setTimeout>[] = [];

    function clearAll() {
      for (const t of timers) clearTimeout(t);
      timers = [];
    }

    function lang(): Lang {
      try {
        return (localStorage.getItem("aqim-lang") as Lang) || "ar";
      } catch {
        return "ar";
      }
    }

    async function show(prayerKey: string) {
      const l = lang();
      const title = translate(l, "reminder.notifTitle", {
        prayer: translate(l, `prayer.${prayerKey}`),
      });
      const body = translate(l, "reminder.notifBody");
      try {
        const reg = await navigator.serviceWorker?.ready;
        if (reg?.showNotification) {
          reg.showNotification(title, { body, icon: "/icon.svg", dir: "auto" });
          return;
        }
      } catch {}
      try {
        new Notification(title, { body, icon: "/icon.svg" });
      } catch {}
    }

    function schedule() {
      clearAll();
      const cfg = loadReminderConfig();
      if (
        !cfg.enabled ||
        cfg.lat == null ||
        cfg.lng == null ||
        typeof Notification === "undefined" ||
        Notification.permission !== "granted"
      ) {
        return;
      }

      const now = Date.now();
      // Today + tomorrow, so the chain survives past midnight.
      for (const dayOffset of [0, 1]) {
        const d = new Date();
        d.setDate(d.getDate() + dayOffset);
        const times = computeTimes(cfg.lat, cfg.lng, cfg.method, d);
        for (const [key, time] of Object.entries(times)) {
          const at = time.getTime() - LEAD_MS;
          if (at > now) {
            timers.push(setTimeout(() => show(key), at - now));
          }
        }
      }
      // Re-plan shortly after midnight (times shift daily).
      const midnight = new Date();
      midnight.setHours(24, 0, 30, 0);
      timers.push(setTimeout(schedule, midnight.getTime() - now));
    }

    schedule();
    window.addEventListener("aqim-reminder-changed", schedule);
    return () => {
      clearAll();
      window.removeEventListener("aqim-reminder-changed", schedule);
    };
  }, []);

  return null;
}
