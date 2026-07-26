"use client";

import { useEffect, useState } from "react";
import { Bell, MapPin } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { PageLoader } from "@/components/Brand";
import {
  CITIES,
  METHOD_KEYS,
  computeTimes,
  loadReminderConfig,
  saveReminderConfig,
  type MethodKey,
  type ReminderConfig,
} from "@/lib/reminder";

// Font-size steps (root scale). Constrained so every screen stays intact.
const FONT_STEPS = [
  { key: "font.small", value: "0.875" },
  { key: "font.normal", value: "1" },
  { key: "font.large", value: "1.125" },
  { key: "font.xlarge", value: "1.25" },
];

export default function SettingsPage() {
  const { t, lang } = useLang();
  const [fontScale, setFontScale] = useState("1");
  const [passLen, setPassLen] = useState("medium");
  const [cfg, setCfg] = useState<ReminderConfig | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      setFontScale(localStorage.getItem("aqim-font-scale") || "1");
      setPassLen(localStorage.getItem("aqim-passage-len") || "medium");
    } catch {}
    setCfg(loadReminderConfig());
  }, []);

  function applyFont(v: string) {
    setFontScale(v);
    try {
      localStorage.setItem("aqim-font-scale", v);
    } catch {}
    document.documentElement.style.setProperty("--font-scale", v);
  }

  function applyPassLen(v: string) {
    setPassLen(v);
    try {
      localStorage.setItem("aqim-passage-len", v);
    } catch {}
  }

  function update(patch: Partial<ReminderConfig>) {
    setCfg((c) => {
      if (!c) return c;
      const next = { ...c, ...patch };
      saveReminderConfig(next);
      return next;
    });
  }

  const [prePrompt, setPrePrompt] = useState(false);

  async function toggleReminder() {
    if (!cfg) return;
    setNotice(null);
    if (cfg.enabled) {
      update({ enabled: false });
      setPrePrompt(false);
      return;
    }
    // First tap: explain what the browser is about to ask, THEN request.
    if (
      !prePrompt &&
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      setPrePrompt(true);
      return;
    }
    await requestAndEnable();
  }

  async function requestAndEnable() {
    setPrePrompt(false);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setNotice(t("reminder.permDenied"));
        return;
      }
    } catch {
      setNotice(t("reminder.permDenied"));
      return;
    }
    update({ enabled: true });
  }

  function useMyLocation() {
    setNotice(null);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        update({
          lat: Math.round(pos.coords.latitude * 100) / 100,
          lng: Math.round(pos.coords.longitude * 100) / 100,
          locationLabel: null,
        });
      },
      () => setNotice(t("reminder.locDenied")),
      { timeout: 12000, maximumAge: 600000 },
    );
  }

  function pickCity(key: string) {
    const c = CITIES.find((x) => x.key === key);
    if (!c) return;
    update({ lat: c.lat, lng: c.lng, locationLabel: key });
  }

  if (!cfg) return <PageLoader />;

  const cityLabel = (k: string) =>
    lang === "ar"
      ? CITIES.find((c) => c.key === k)?.ar
      : CITIES.find((c) => c.key === k)?.en;

  // Never show raw coordinates — a city name or a friendly confirmation.
  const locationText = cfg.locationLabel
    ? cityLabel(cfg.locationLabel)
    : cfg.lat != null
      ? t("reminder.autoLocated")
      : null;

  return (
    <div className="space-y-5 pt-2 max-w-2xl">
      <h1 className="text-xl font-bold">{t("settings.title")}</h1>

      <div className="card divide-y divide-border overflow-hidden">
        {/* Account (optional — saves history across devices) */}
        <Row label={t("settings.account")}>
          <a href="/account" className="btn-primary px-4 py-1.5 text-xs">
            {t("account.title")}
          </a>
        </Row>

        {/* Language */}
        <Row label={t("settings.language")}>
          <LanguageToggle />
        </Row>

        {/* Font size */}
        <Row label={t("settings.fontSize")}>
          <div className="inline-flex items-center rounded-lg border border-border bg-surface p-0.5 text-xs font-bold">
            {FONT_STEPS.map((s) => (
              <button
                key={s.value}
                onClick={() => applyFont(s.value)}
                aria-pressed={fontScale === s.value}
                className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                  fontScale === s.value
                    ? "bg-primary text-white"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {t(s.key)}
              </button>
            ))}
          </div>
        </Row>

        {/* Suggested passage length */}
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">{t("settings.passageLen")}</span>
            <div className="inline-flex items-center rounded-lg border border-border bg-surface p-0.5 text-xs font-bold">
              {(["short", "medium", "long"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => applyPassLen(v)}
                  aria-pressed={passLen === v}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                    passLen === v
                      ? "bg-primary text-white"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {t(`len.${v}`)}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-muted mt-1.5">{t("settings.lenHint")}</p>
        </div>

        {/* Offline Quran — download all 604 pages into the local cache */}
        <OfflineRow />

        {/* Replay the intro tour */}
        <Row label={t("settings.replayTour")}>
          <button
            onClick={() => {
              try {
                localStorage.removeItem("aqim-onboarded");
              } catch {}
              window.location.href = "/home";
            }}
            className="btn-primary px-4 py-1.5 text-xs"
          >
            {t("settings.replayTourHint")}
          </button>
        </Row>

        {/* Prayer reminder */}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-medium flex items-center gap-1.5">
                <Bell size={15} className="text-primary" />
                {t("reminder.title")}
              </div>
              <div className="text-xs text-muted mt-0.5">{t("reminder.hint")}</div>
            </div>
            <button
              onClick={toggleReminder}
              role="switch"
              aria-checked={cfg.enabled}
              className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                cfg.enabled ? "bg-primary" : "bg-surface-2 border border-border"
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${
                  cfg.enabled ? "start-6" : "start-1"
                }`}
              />
            </button>
          </div>

          {prePrompt && (
            <div className="rounded-xl bg-primary-soft p-3.5 space-y-2.5">
              <p className="text-xs leading-relaxed">{t("reminder.prePrompt")}</p>
              <button
                onClick={requestAndEnable}
                className="btn-primary px-5 py-2 text-xs"
              >
                {t("common.continue")}
              </button>
            </div>
          )}

          {cfg.enabled && (
            <>
              {/* Location */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <MapPin size={14} className="text-primary" />
                    {t("reminder.location")}
                  </span>
                  <span className="text-xs text-muted truncate">
                    {locationText ?? t("reminder.noLocation")}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={useMyLocation}
                    className="btn-primary px-3.5 py-1.5 text-xs"
                  >
                    {cfg.lat != null && !cfg.locationLabel
                      ? t("reminder.refresh")
                      : t("reminder.useMyLocation")}
                  </button>
                  <select
                    value={cfg.locationLabel ?? ""}
                    onChange={(e) => e.target.value && pickCity(e.target.value)}
                    className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
                  >
                    <option value="">{t("reminder.orCity")}</option>
                    {CITIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {lang === "ar" ? c.ar : c.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Calculation method — the default (Umm al-Qura) is only
                  right in some regions */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium">{t("reminder.method")}</span>
                <select
                  value={cfg.method}
                  onChange={(e) => update({ method: e.target.value as MethodKey })}
                  className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs max-w-[55%]"
                >
                  {METHOD_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {t(`method.${k}`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Today's five times — immediate proof it's set up right */}
              {cfg.lat != null && cfg.lng != null && (
                <TodayTimes
                  lat={cfg.lat}
                  lng={cfg.lng}
                  method={cfg.method}
                />
              )}

            </>
          )}

          {notice && (
            <p className="text-xs text-accent bg-accent-soft rounded-lg p-2.5">
              {notice}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Download the entire Mushaf text into the offline cache. Pages the user
// reads are cached automatically anyway; this button completes the set.
function OfflineRow() {
  const { t } = useLang();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [done, setDone] = useState(0);

  useEffect(() => {
    // Consider it downloaded if a spread of probe pages is cached.
    (async () => {
      try {
        const cache = await caches.open("aqim-mushaf-v1");
        for (const p of [1, 302, 604]) {
          if (!(await cache.match(`${location.origin}/api/mushaf?page=${p}`)))
            return;
        }
        setState("done");
      } catch {}
    })();
  }, []);

  async function download() {
    if (state === "busy") return;
    setState("busy");
    setDone(0);
    try {
      const cache = await caches.open("aqim-mushaf-v1");
      let n = 0;
      for (let p = 1; p <= 604; p += 8) {
        const batch: Promise<void>[] = [];
        for (let q = p; q < Math.min(p + 8, 605); q++) {
          const url = `${location.origin}/api/mushaf?page=${q}`;
          batch.push(
            cache.match(url).then(async (hit) => {
              if (!hit) {
                const res = await fetch(url);
                if (res.ok) await cache.put(url, res);
              }
              n++;
              setDone(n);
            }),
          );
        }
        await Promise.all(batch);
      }
      setState("done");
    } catch {
      setState("idle");
    }
  }

  return (
    <div className="p-4 flex items-center justify-between gap-4">
      <span className="text-sm font-medium">{t("settings.offline")}</span>
      {state === "done" ? (
        <span className="text-xs text-secondary font-bold">
          {t("settings.offlineDone")}
        </span>
      ) : (
        <button
          onClick={download}
          disabled={state === "busy"}
          className="btn-primary px-4 py-1.5 text-xs disabled:opacity-70"
        >
          {state === "busy"
            ? t("settings.offlineProgress", { n: done })
            : t("settings.offlineBtn")}
        </button>
      )}
    </div>
  );
}

// Today's five prayer times, next one highlighted.
function TodayTimes({
  lat,
  lng,
  method,
}: {
  lat: number;
  lng: number;
  method: MethodKey;
}) {
  const { t, lang } = useLang();
  const times = computeTimes(lat, lng, method);
  const order = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
  const now = Date.now();
  const nextKey = order.find((k) => times[k].getTime() > now);
  const fmt = (d: Date) =>
    d.toLocaleTimeString(lang === "ar" ? "ar" : "en", {
      hour: "numeric",
      minute: "2-digit",
    });
  return (
    <div>
      <div className="text-[11px] font-bold text-muted mb-1.5">
        {t("reminder.todayTimes")}
      </div>
      <div className="grid grid-cols-5 gap-1.5 text-center">
        {order.map((k) => (
          <div
            key={k}
            className={`rounded-xl py-2 px-1 ${
              k === nextKey
                ? "bg-primary text-white"
                : "bg-surface-2 text-foreground"
            }`}
          >
            <div
              className={`text-[10px] ${k === nextKey ? "text-white/70" : "text-muted"}`}
            >
              {t(`prayer.${k}`)}
            </div>
            <div className="text-[11px] font-bold tabular-nums whitespace-nowrap">
              {fmt(times[k])}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}
