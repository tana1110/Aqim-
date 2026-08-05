"use client";

import { useEffect, useRef } from "react";
import { bootSync, pushState } from "@/lib/sync";
import { saveStreakCache } from "@/lib/streak";

// Invisible: restores state from the server on boot and mirrors every
// change back (debounced), so streaks/wird/tasbih survive reinstalls.
export function SyncClient() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void bootSync();
    // the server owns the daily streak — refresh the local mirror
    fetch("/api/streak")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.count === "number") {
          saveStreakCache({ count: d.count, lastDay: d.lastDay ?? null });
        }
      })
      .catch(() => {});

    const schedule = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void pushState(), 2500);
    };
    const flush = () => {
      if (document.visibilityState === "hidden") void pushState();
    };
    const events = [
      "aqim-wird-changed",
      "aqim-tasbih-changed",
      "aqim-widgets-changed",
      "aqim-streak-changed",
      "aqim-reminder-changed",
    ];
    for (const ev of events) window.addEventListener(ev, schedule);
    document.addEventListener("visibilitychange", flush);
    return () => {
      for (const ev of events) window.removeEventListener(ev, schedule);
      document.removeEventListener("visibilitychange", flush);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return null;
}
