"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sunrise, Star, MoonStar, Sparkles, RefreshCw, Check } from "lucide-react";
import { PassageCard } from "@/components/PassageCard";
import { useLang } from "@/components/LanguageProvider";
import type { Mode, PassageContent, ResolvedPlan } from "@/lib/types";

const FARAID_PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const NAFL_PRAYERS = [
  "fajr-sunnah",
  "dhuhr-nafl",
  "maghrib-sunnah",
  "isha-shaf",
  "witr",
  "free",
];
const MODES: { key: Mode; Icon: typeof Sunrise }[] = [
  { key: "faraid", Icon: Sunrise },
  { key: "nafl", Icon: Star },
  { key: "qiyam", Icon: MoonStar },
];

export default function HomePage() {
  const { t, lang } = useLang();
  const [status, setStatus] = useState<{
    seeded: boolean;
    hasMemorization: boolean;
  } | null>(null);
  const [mode, setMode] = useState<Mode>("faraid");
  const [prayer, setPrayer] = useState<string>("fajr");
  const [rakahs, setRakahs] = useState(2);
  const [plan, setPlan] = useState<ResolvedPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) =>
        setStatus({ seeded: d.seeded, hasMemorization: d.hasMemorization }),
      )
      .catch(() => setStatus({ seeded: false, hasMemorization: false }));
  }, []);

  useEffect(() => {
    if (mode === "faraid") setPrayer("fajr");
    else if (mode === "nafl") setPrayer("fajr-sunnah");
  }, [mode]);

  useEffect(() => {
    setPlan(null);
  }, [mode, prayer, rakahs]);

  async function aqim() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, prayer, rakahs }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setPlan(data.plan);
    } catch {
      setError(t("home.error"));
    } finally {
      setLoading(false);
    }
  }

  if (status && !status.seeded) {
    return (
      <div className="card p-6 text-center mt-6">
        <h1 className="text-lg font-bold mb-2">{t("db.notReady.title")}</h1>
        <p className="text-sm text-muted leading-relaxed">
          {t("db.notReady.body")}
        </p>
        <pre
          className="mt-3 text-left text-xs bg-surface-2 rounded-2xl p-3 overflow-x-auto"
          dir="ltr"
        >
          npm run db:start{"\n"}npm run db:seed
        </pre>
      </div>
    );
  }

  const showRakahInput =
    mode === "qiyam" || (mode === "nafl" && prayer === "free");

  return (
    <div className="pt-2 lg:grid lg:grid-cols-[minmax(340px,400px)_1fr] lg:gap-8 lg:items-start">
      {/* Controls column */}
      <div className="space-y-5 lg:sticky lg:top-20">
        <section className="card overflow-hidden animate-rise">
          <div className="p-5 bg-primary-soft">
            <p className="text-xs text-muted mb-1">{t("home.greeting")}</p>
            <h1 className="font-heading text-[1.7rem] leading-tight text-foreground">
              {t("home.title")}
            </h1>
            <p className="text-sm text-muted mt-1.5">{t("home.subtitle")}</p>
          </div>
        </section>

        {status && !status.hasMemorization && (
          <Link
            href="/setup"
            className="flex items-center gap-3 card p-4 bg-accent-soft border-accent/30 active:scale-[0.99] transition"
          >
            <Sparkles size={18} className="text-accent shrink-0" />
            <span className="text-sm">{t("home.setMemoFirst")}</span>
          </Link>
        )}

        {/* Mode */}
        <div>
          <SectionLabel>{t("home.type")}</SectionLabel>
          <div className="grid grid-cols-3 gap-2.5">
            {MODES.map((m) => {
              const on = mode === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={`card !shadow-none p-3 flex flex-col items-center gap-1.5 transition active:scale-[0.97] ${
                    on ? "!bg-primary-soft border-primary/40" : "hover:border-primary/30"
                  }`}
                >
                  <m.Icon
                    size={22}
                    className={on ? "text-primary" : "text-muted"}
                    strokeWidth={on ? 2.4 : 2}
                  />
                  <span className="text-sm font-bold leading-none">
                    {t(`mode.${m.key}`)}
                  </span>
                  <span className="text-[10px] text-muted">
                    {t(`mode.${m.key}.hint`)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Prayer */}
        {mode !== "qiyam" && (
          <div>
            <SectionLabel>{t("home.prayer")}</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {(mode === "faraid" ? FARAID_PRAYERS : NAFL_PRAYERS).map((p) => (
                <button
                  key={p}
                  onClick={() => setPrayer(p)}
                  data-on={prayer === p}
                  className="pill px-4 py-2 text-sm font-medium active:scale-[0.97]"
                >
                  {t(`prayer.${p}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {showRakahInput && (
          <div className="flex items-center justify-between card p-4">
            <span className="text-sm text-muted">{t("home.rakahs")}</span>
            <Stepper value={rakahs} onChange={setRakahs} min={1} max={20} />
          </div>
        )}

        <button
          onClick={aqim}
          disabled={loading}
          className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <RefreshCw size={20} className="animate-spin" />
          ) : (
            <span className="font-quran text-2xl leading-none">أقِم</span>
          )}
        </button>

        {error && (
          <div className="text-sm text-primary text-center bg-primary-soft rounded-xl p-3">
            {error}
          </div>
        )}
      </div>

      {/* Results column */}
      <div className="mt-6 lg:mt-0">
        {plan ? (
          <PlanView plan={plan} prayer={prayer} lang={lang} />
        ) : (
          <div className="hidden lg:flex items-center justify-center text-center text-sm text-muted card border-dashed min-h-[320px] p-8">
            {t("home.emptyState")}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-bold text-muted mb-2 px-1">{children}</div>;
}

function Stepper({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-9 h-9 rounded-full bg-surface-2 border border-border grid place-items-center text-lg active:scale-90 transition"
        aria-label="-"
      >
        −
      </button>
      <span className="w-8 text-center font-bold tabular-nums">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-9 h-9 rounded-full bg-primary text-white grid place-items-center text-lg active:scale-90 transition"
        aria-label="+"
      >
        +
      </button>
    </div>
  );
}

function PlanView({
  plan,
  prayer,
  lang,
}: {
  plan: ResolvedPlan;
  prayer: string;
  lang: string;
}) {
  const { t } = useLang();
  return (
    <section className="space-y-3 animate-rise">
      <div className="flex items-baseline justify-between pt-1">
        <h2 className="font-quran text-2xl text-primary">
          {lang === "ar" ? plan.titleArabic : plan.title}
        </h2>
      </div>

      {plan.relaxed && (
        <p className="text-xs text-accent bg-accent-soft rounded-xl p-2.5">
          {t("home.relaxed")}
        </p>
      )}
      {plan.exhausted && (
        <p className="text-xs text-primary bg-primary-soft rounded-xl p-2.5">
          {t("home.exhausted")}
        </p>
      )}

      {plan.slots.map((slot, i) => (
        <SlotView
          key={i}
          rakah={slot.rakah}
          kind={slot.kind}
          label={slot.label}
          content={slot.content}
          mode={plan.mode}
          prayer={prayer}
          otherPassages={plan.slots
            .map((s) => s.content)
            .filter((c): c is PassageContent => !!c)}
        />
      ))}
    </section>
  );
}

function SlotView({
  rakah,
  kind,
  label,
  content: initial,
  mode,
  prayer,
  otherPassages,
}: {
  rakah: number;
  kind: string;
  label?: string;
  content: PassageContent | null;
  mode: Mode;
  prayer: string;
  otherPassages: PassageContent[];
}) {
  const { t } = useLang();
  const [content, setContent] = useState<PassageContent | null>(initial);
  const [used, setUsed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setContent(initial);
    setUsed(false);
  }, [initial]);

  const rakahLabel =
    rakah <= 4 ? t(`rakah.${rakah}`) : t("rakah.n", { n: rakah });

  if (kind === "fatiha-only") {
    return (
      <div className="card p-4 flex items-center justify-between">
        <span className="text-sm font-bold">{rakahLabel}</span>
        <span className="text-sm text-muted">{t("home.fatihaOnly")}</span>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="card p-4 text-sm text-muted">
        {rakahLabel}: {t("home.noSuggestion")}
      </div>
    );
  }

  async function suggestAnother() {
    setBusy(true);
    try {
      const exclude = [
        {
          surahNumber: content!.surahNumber,
          fromAyah: content!.fromAyah,
          toAyah: content!.toAyah,
        },
        ...otherPassages.map((p) => ({
          surahNumber: p.surahNumber,
          fromAyah: p.fromAyah,
          toAyah: p.toAyah,
        })),
      ];
      const res = await fetch("/api/suggest-one", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, exclude }),
      });
      const data = await res.json();
      if (data.content) {
        setContent(data.content);
        setUsed(false);
      }
    } finally {
      setBusy(false);
    }
  }

  async function markUsed() {
    setBusy(true);
    try {
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prayerType: prayer,
          mode,
          rakahNumber: rakah,
          surahNumber: content!.surahNumber,
          fromAyah: content!.fromAyah,
          toAyah: content!.toAyah,
        }),
      });
      setUsed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs font-bold text-muted">{rakahLabel}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <PassageCard
        content={content}
        fixedLabel={kind === "fixed" ? label : undefined}
      />
      {kind === "suggest" && (
        <div className="flex gap-2">
          <button
            onClick={markUsed}
            disabled={busy || used}
            className={`flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-1.5 transition ${
              used
                ? "bg-accent-soft text-accent border border-accent/40 rounded-lg"
                : "btn-accent"
            } disabled:opacity-70`}
          >
            {used ? (
              <>
                <Check size={16} /> {t("home.logged")}
              </>
            ) : (
              t("home.usedThis")
            )}
          </button>
          <button
            onClick={suggestAnother}
            disabled={busy}
            className="flex-1 rounded-lg border border-border bg-surface py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 hover:border-primary/40 transition disabled:opacity-60"
          >
            <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
            {t("home.suggestAnother")}
          </button>
        </div>
      )}
    </div>
  );
}
