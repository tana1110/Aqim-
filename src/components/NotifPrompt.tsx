"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { installCardKind } from "@/components/InstallPrompt";
import { isNativeApp } from "@/lib/nativeBridge";
import { loadReminderConfig, saveReminderConfig } from "@/lib/reminder";

// Home card that asks people to turn on prayer reminders — one tap does it
// all (permission + location). Inside the Android app the OS permission is
// handled natively, so only the setting is switched on. «لاحقًا» snoozes it
// for a week. Never shown alongside the install card or the first-visit tip.

const SNOOZE_KEY = "aqim-notif-snooze";
const WEEK = 7 * 24 * 3600 * 1000;

function shouldShow(): boolean {
  if (loadReminderConfig().enabled) return false;
  if (installCardKind()) return false;
  try {
    if (localStorage.getItem("aqim-start-tip") === "1") return false;
    if (Date.now() - Number(localStorage.getItem(SNOOZE_KEY) || 0) < WEEK) return false;
  } catch {
    return false;
  }
  if (isNativeApp()) return true;
  return typeof Notification !== "undefined" && Notification.permission !== "denied";
}

export function NotifPrompt() {
  const { t } = useLang();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"ask" | "done" | "needCity" | "blocked">("ask");

  useEffect(() => {
    setShow(shouldShow());
  }, []);

  function later() {
    setShow(false);
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    } catch {}
  }

  async function enable() {
    setBusy(true);
    if (!isNativeApp()) {
      try {
        if ((await Notification.requestPermission()) !== "granted") {
          setState("blocked");
          setBusy(false);
          return;
        }
      } catch {
        setState("blocked");
        setBusy(false);
        return;
      }
    }
    const cfg = loadReminderConfig();
    const finish = (patch: Partial<typeof cfg>, next: "done" | "needCity") => {
      saveReminderConfig({ ...cfg, enabled: true, ...patch });
      setState(next);
      setBusy(false);
      if (next === "done") setTimeout(() => setShow(false), 2500);
    };
    // Prayer times need a place; ask once, or fall back to picking a city.
    if (cfg.lat != null || !navigator.geolocation) {
      finish({}, cfg.lat != null ? "done" : "needCity");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        finish(
          {
            lat: Math.round(pos.coords.latitude * 100) / 100,
            lng: Math.round(pos.coords.longitude * 100) / 100,
            locationLabel: null,
          },
          "done",
        ),
      () => finish({}, "needCity"),
      { timeout: 12000, maximumAge: 600000 },
    );
  }

  if (!show) return null;

  return (
    <section className="card p-4 flex items-start gap-3 animate-rise">
      <span className="w-10 h-10 rounded-2xl bg-primary-soft text-primary grid place-items-center shrink-0">
        {state === "done" ? <Check size={20} /> : <Bell size={20} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-extrabold">
          {state === "done" ? t("notifCard.done") : t("notifCard.title")}
        </div>
        {state !== "done" && (
          <p className="text-xs text-muted mt-0.5 leading-relaxed">
            {state === "needCity"
              ? t("notifCard.needCity")
              : state === "blocked"
                ? t("reminder.permDenied")
                : t("reminder.hint")}
          </p>
        )}
        {state === "ask" && (
          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={enable}
              disabled={busy}
              className="btn-cta !rounded-full px-4 py-2 text-xs flex items-center gap-1.5 disabled:opacity-60"
            >
              <Bell size={13} />
              {t("notifCard.btn")}
            </button>
            <button onClick={later} className="px-3 py-2 text-xs text-muted hover:text-foreground">
              {t("install.later")}
            </button>
          </div>
        )}
        {state === "needCity" && (
          <Link href="/settings" className="inline-block mt-2.5 btn-cta !rounded-full px-4 py-2 text-xs">
            {t("notifCard.chooseCity")}
          </Link>
        )}
      </div>
    </section>
  );
}
