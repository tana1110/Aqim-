"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, MapPin } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { PageLoader } from "@/components/Brand";
import {
  CITIES,
  METHOD_KEYS,
  loadReminderConfig,
  saveReminderConfig,
  type MethodKey,
  type ReminderConfig,
} from "@/lib/reminder";

// Font-size steps (root scale). Constrained so every screen stays intact;
// the slider snaps to exactly these — never an arbitrary in-between value.
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
  // Once a location is confirmed, the pickers hide behind a "change" link.
  const [editLocation, setEditLocation] = useState(false);

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
        setEditLocation(false);
      },
      () => setNotice(t("reminder.locDenied")),
      { timeout: 12000, maximumAge: 600000 },
    );
  }

  function pickCity(key: string) {
    const c = CITIES.find((x) => x.key === key);
    if (!c) return;
    update({ lat: c.lat, lng: c.lng, locationLabel: key });
    setEditLocation(false);
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
  const locationSet = cfg.lat != null;

  const fontIdx = Math.max(
    0,
    FONT_STEPS.findIndex((s) => s.value === fontScale),
  );

  return (
    <div className="space-y-6 pt-2 max-w-2xl">
      <h1 className="text-xl font-bold">{t("settings.title")}</h1>

      {/* ---- Account & language ---- */}
      <Section title={t("settings.sec.account")}>
        <Row label={t("settings.account")}>
          <Link href="/account" className="btn-primary px-4 py-1.5 text-xs">
            {t("account.title")}
          </Link>
        </Row>
        <Row label={t("settings.language")}>
          <LanguageToggle />
        </Row>
      </Section>

      {/* ---- Reading & display ---- */}
      <Section title={t("settings.sec.reading")}>
        {/* Font size — a stepped slider like the phone's own display
            settings; snaps to the four safe sizes. */}
        <div className="p-4 space-y-3">
          <span className="text-sm font-medium">{t("settings.fontSize")}</span>
          <input
            type="range"
            min={0}
            max={FONT_STEPS.length - 1}
            step={1}
            value={fontIdx}
            onChange={(e) => applyFont(FONT_STEPS[+e.target.value].value)}
            aria-label={t("settings.fontSize")}
            className="font-slider w-full"
            style={
              {
                "--p": `${(fontIdx / (FONT_STEPS.length - 1)) * 100}%`,
              } as React.CSSProperties
            }
          />
          <div className="flex justify-between text-[10px] font-bold">
            {FONT_STEPS.map((s, i) => (
              <button
                key={s.value}
                onClick={() => applyFont(s.value)}
                className={i === fontIdx ? "text-primary" : "text-muted"}
              >
                {t(s.key)}
              </button>
            ))}
          </div>
          {/* Live preview — updates while dragging */}
          <p
            className="rounded-xl bg-surface-2 p-3 text-muted leading-relaxed"
            style={{ fontSize: `calc(0.875rem * ${fontScale})` }}
          >
            {t("settings.fontPreview")}
          </p>
        </div>

        {/* Suggested passage length */}
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">
              {t("settings.passageLen")}
            </span>
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
          <p className="text-[11px] text-muted mt-1.5">
            {t("settings.lenHint")}
          </p>
        </div>

        {/* Offline Quran — download all 604 pages into the local cache */}
        <OfflineRow />
      </Section>

      {/* ---- Notifications & location ---- */}
      <Section title={t("settings.sec.notifs")}>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-medium flex items-center gap-1.5">
                <Bell size={15} className="text-primary" />
                {t("reminder.title")}
              </div>
              <div className="text-xs text-muted mt-0.5">
                {t("reminder.hint")}
              </div>
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
              <p className="text-xs leading-relaxed">
                {t("reminder.prePrompt")}
              </p>
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
              {/* Location — once set, the pickers fold away behind
                  a small "change" link */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <MapPin size={14} className="text-primary" />
                    {t("reminder.location")}
                  </span>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted truncate">
                      {locationText ?? t("reminder.noLocation")}
                    </span>
                    {locationSet && !editLocation && (
                      <button
                        onClick={() => setEditLocation(true)}
                        className="text-xs font-bold text-primary shrink-0"
                      >
                        {t("settings.change")}
                      </button>
                    )}
                  </span>
                </div>
                {(!locationSet || editLocation) && (
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
                      onChange={(e) =>
                        e.target.value && pickCity(e.target.value)
                      }
                      className="rounded-xl border border-border bg-surface px-2 py-1.5 text-xs"
                    >
                      <option value="">{t("reminder.orCity")}</option>
                      {CITIES.map((c) => (
                        <option key={c.key} value={c.key}>
                          {lang === "ar" ? c.ar : c.en}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Calculation method — the default (Umm al-Qura) is only
                  right in some regions */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium">
                  {t("reminder.method")}
                </span>
                <select
                  value={cfg.method}
                  onChange={(e) =>
                    update({ method: e.target.value as MethodKey })
                  }
                  className="rounded-xl border border-border bg-surface px-2 py-1.5 text-xs max-w-[55%]"
                >
                  {METHOD_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {t(`method.${k}`)}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {notice && (
            <p className="text-xs text-accent bg-accent-soft rounded-lg p-2.5">
              {notice}
            </p>
          )}
        </div>
      </Section>

      {/* ---- General ---- */}
      <Section title={t("settings.sec.general")}>
        <Row label={t("settings.replayTour")}>
          <button
            onClick={() => {
              try {
                localStorage.removeItem("aqim-onboarded");
                localStorage.removeItem("aqim-tour-done");
              } catch {}
              window.location.href = "/home";
            }}
            className="btn-primary px-4 py-1.5 text-xs"
          >
            {t("settings.replayTourHint")}
          </button>
        </Row>
      </Section>
    </div>
  );
}

// A labeled settings group: small muted heading + one consistent card.
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-[11px] font-bold text-muted px-1">{title}</h2>
      <div className="card divide-y divide-border overflow-hidden">
        {children}
      </div>
    </section>
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
          // text + the exact 15-line layout (page fonts cache as you read)
          for (const url of [
            `${location.origin}/api/mushaf?page=${q}`,
            `${location.origin}/api/mushaf-exact?page=${q}&v=2`,
          ]) {
            batch.push(
              cache.match(url).then(async (hit) => {
                if (!hit) {
                  const res = await fetch(url);
                  if (res.ok) await cache.put(url, res);
                }
              }),
            );
          }
          batch.push(
            Promise.resolve().then(() => {
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
