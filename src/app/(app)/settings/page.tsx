"use client";

import { useEffect, useState } from "react";
import { Bell, MapPin, Info } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { PageLoader } from "@/components/Brand";
import {
  CITIES,
  loadReminderConfig,
  saveReminderConfig,
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

  async function toggleReminder() {
    if (!cfg) return;
    setNotice(null);
    if (cfg.enabled) {
      update({ enabled: false });
      return;
    }
    // Ask for notification permission only now — when the user opts in.
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

  const locationText = cfg.locationLabel
    ? cityLabel(cfg.locationLabel)
    : cfg.lat != null
      ? `${cfg.lat}, ${cfg.lng}`
      : null;

  return (
    <div className="space-y-5 pt-2 max-w-2xl">
      <h1 className="text-xl font-bold">{t("settings.title")}</h1>

      <div className="card divide-y divide-border overflow-hidden">
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

          <p className="text-xs text-muted leading-relaxed">
            {t("reminder.explain")}
          </p>

          {cfg.enabled && (
            <>
              {/* Calculation method is intentionally NOT user-facing — a
                  sensible default (Umm al-Qura) is hardcoded in lib/reminder. */}

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

              <p className="text-[11px] text-muted flex items-start gap-1.5">
                <Info size={12} className="mt-0.5 shrink-0" />
                {t("reminder.reliability")}
              </p>
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
