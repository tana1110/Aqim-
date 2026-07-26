"use client";

import { useEffect } from "react";
import { computeTimes, loadReminderConfig } from "@/lib/reminder";
import { loadWird, isDoneToday } from "@/lib/wird";
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

    async function showWird() {
      if (isDoneToday()) return; // already completed — no nag
      const l = lang();
      const title = translate(l, "wird.notifTitle");
      const body = translate(l, "wird.notifBody");
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

    function scheduleWird() {
      const w = loadWird();
      if (
        !w.enabled ||
        typeof Notification === "undefined" ||
        Notification.permission !== "granted"
      )
        return;
      const [hh, mm] = w.time.split(":").map(Number);
      // Today's slot if still ahead, else tomorrow's.
      for (const dayOffset of [0, 1]) {
        const at = new Date();
        at.setDate(at.getDate() + dayOffset);
        at.setHours(hh || 20, mm || 0, 0, 0);
        if (at.getTime() > Date.now()) {
          timers.push(setTimeout(showWird, at.getTime() - Date.now()));
          break;
        }
      }
    }

    // Keep the server-side push subscription in sync so reminders arrive
    // even when the app is closed (in-page timers below only cover the
    // app-open case).
    function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
      const padding = "=".repeat((4 - (base64.length % 4)) % 4);
      const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
      const raw = atob(b64);
      const out = new Uint8Array(new ArrayBuffer(raw.length));
      for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
      return out;
    }

    async function syncPush() {
      try {
        if (
          typeof Notification === "undefined" ||
          Notification.permission !== "granted"
        )
          return;
        const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!key) return;
        const reg = await navigator.serviceWorker.ready;
        if (!reg.pushManager) return;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(key),
          });
        }
        const cfg = loadReminderConfig();
        const w = loadWird();
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: sub.toJSON(),
            lang: lang(),
            lat: cfg.lat,
            lng: cfg.lng,
            method: cfg.method,
            prayers: cfg.enabled && cfg.lat != null,
            wirdTime: w.enabled ? w.time : null,
            adhkar: true,
            tzOffset: -new Date().getTimezoneOffset(),
          }),
        });
      } catch {}
    }

    function schedule() {
      clearAll();
      scheduleWird();
      void syncPush();
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
    window.addEventListener("aqim-wird-changed", schedule);
    return () => {
      clearAll();
      window.removeEventListener("aqim-reminder-changed", schedule);
      window.removeEventListener("aqim-wird-changed", schedule);
    };
  }, []);

  return null;
}
