"use client";

import { useEffect, useState } from "react";
import { Check, Info } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import type { AppSettings } from "@/lib/types";

export default function SettingsPage() {
  const { t } = useLang();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings))
      .catch(() => {});
  }, []);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSaved(false);
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  async function save() {
    if (!settings) return;
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSettings((await res.json()).settings);
    setSaved(true);
  }

  if (!settings)
    return <div className="h-40 rounded-2xl bg-surface-2 animate-pulse mt-4" />;

  return (
    <div className="space-y-5 pt-2 max-w-2xl">
      <h1 className="text-xl font-bold">{t("settings.title")}</h1>

      <div className="card divide-y divide-border overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <span className="text-sm font-medium">{t("settings.language")}</span>
          <LanguageToggle />
        </div>
        <NumberField
          label={t("settings.witr")}
          hint={t("settings.witr.hint")}
          value={settings.witrRakahs}
          min={1}
          max={11}
          onChange={(v) => update("witrRakahs", v)}
        />
        <NumberField
          label={t("settings.noRepeat")}
          hint={t("settings.noRepeat.hint")}
          value={settings.noRepeatWindow}
          min={1}
          max={100}
          onChange={(v) => update("noRepeatWindow", v)}
        />
        <NumberField
          label={t("settings.qiyamWindow")}
          hint={t("settings.qiyamWindow.hint")}
          value={settings.qiyamRepeatWindow}
          min={1}
          max={100}
          onChange={(v) => update("qiyamRepeatWindow", v)}
        />
        <NumberField
          label={t("settings.shortSurah")}
          hint={t("settings.shortSurah.hint")}
          value={settings.maxAyahShort}
          min={3}
          max={50}
          onChange={(v) => update("maxAyahShort", v)}
        />
        <div className="flex items-center justify-between p-4 gap-4">
          <span className="text-sm font-medium">
            {t("settings.tafsirSource")}
          </span>
          <span className="text-xs text-muted text-end">
            {t("settings.tafsirSource.value")}
          </span>
        </div>
      </div>

      <div className="card p-4 flex gap-3 bg-accent-soft border-accent/25">
        <Info size={18} className="text-accent shrink-0 mt-0.5" />
        <p className="text-xs text-foreground/80 leading-relaxed">
          {t("settings.fiqhNote")}
        </p>
      </div>

      <button
        onClick={save}
        className="btn-primary w-full py-3.5 flex items-center justify-center gap-2"
      >
        {saved ? (
          <>
            <Check size={18} /> {t("settings.settingsSaved")}
          </>
        ) : (
          t("settings.saveSettings")
        )}
      </button>
    </div>
  );
}

function NumberField({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted mt-0.5">{hint}</div>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-9 h-9 rounded-full bg-surface-2 border border-border grid place-items-center text-lg active:scale-90 transition"
          aria-label="-"
        >
          −
        </button>
        <span className="w-7 text-center font-bold tabular-nums">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-9 h-9 rounded-full bg-primary text-white grid place-items-center text-lg active:scale-90 transition"
          aria-label="+"
        >
          +
        </button>
      </div>
    </div>
  );
}
