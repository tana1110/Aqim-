"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, RefreshCw, Check } from "lucide-react";
import { LogoLoader } from "@/components/Logo";
import { ContentCard } from "@/components/ContentCard";
import { PassageCard } from "@/components/PassageCard";
import { computeTimes, loadReminderConfig } from "@/lib/reminder";
import { useLang } from "@/components/LanguageProvider";
import { surahName, cleanAyah } from "@/lib/quranDisplay";
import type { Mode, PassageContent, ResolvedPlan } from "@/lib/types";

// One row of everything the user can pray — tapping a chip sets both the
// prayer and its mode. No "type" step.
const CHIPS: { key: string; mode: Mode }[] = [
  { key: "fajr", mode: "faraid" },
  { key: "dhuhr", mode: "faraid" },
  { key: "asr", mode: "faraid" },
  { key: "maghrib", mode: "faraid" },
  { key: "isha", mode: "faraid" },
  { key: "fajr-sunnah", mode: "nafl" },
  { key: "dhuhr-nafl", mode: "nafl" },
  { key: "maghrib-sunnah", mode: "nafl" },
  { key: "isha-shaf", mode: "nafl" },
  { key: "witr", mode: "nafl" },
  { key: "free", mode: "nafl" },
  { key: "qiyam", mode: "qiyam" },
];

// Rough time-of-day default so the hero already shows the likely next prayer.
function defaultPrayer(): string {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  if (h >= 3 && h < 11) return "fajr";
  if (h < 15) return "dhuhr";
  if (h < 17.5) return "asr";
  if (h < 19.5) return "maghrib";
  if (h < 23) return "isha";
  return "qiyam";
}

interface DailyAyah {
  surahNumber: number;
  ayahNumber: number;
  arabicText: string;
  surahNameArabic: string;
  surahNameTranslit: string;
  translation: string | null;
}

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
  const [daily, setDaily] = useState<DailyAyah | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) =>
        setStatus({ seeded: d.seeded, hasMemorization: d.hasMemorization }),
      )
      .catch(() => setStatus({ seeded: false, hasMemorization: false }));
    fetch("/api/daily-ayah")
      .then((r) => r.json())
      .then((d) => setDaily(d.ayah))
      .catch(() => {});
  }, []);

  // Hijri date for the greeting.
  const hijri = (() => {
    try {
      return new Intl.DateTimeFormat(
        lang === "ar" ? "ar-SA-u-ca-islamic-umalqura" : "en-u-ca-islamic-umalqura",
        { day: "numeric", month: "long", year: "numeric" },
      ).format(new Date());
    } catch {
      return "";
    }
  })();

  // Next prayer for the info card. With a saved location we compute exact
  // times on-device (adhan); otherwise fall back to a time-of-day heuristic.
  const [heroKey, setHeroKey] = useState<string>("fajr");
  const [nextAt, setNextAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const p = defaultPrayer();
    setHeroKey(p);
    setPrayer(p);
    setMode(CHIPS.find((c) => c.key === p)?.mode ?? "faraid");

    const cfg = loadReminderConfig();
    if (cfg.lat == null || cfg.lng == null) return;

    function computeNext() {
      const nowMs = Date.now();
      for (const off of [0, 1]) {
        const d = new Date();
        d.setDate(d.getDate() + off);
        const times = computeTimes(cfg.lat!, cfg.lng!, cfg.method, d);
        for (const k of ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const) {
          const t = times[k].getTime();
          if (t > nowMs) {
            setHeroKey(k);
            setNextAt(t);
            setPrayer(k);
            setMode("faraid");
            return;
          }
        }
      }
    }
    computeNext();
    const iv = setInterval(computeNext, 60_000);
    return () => clearInterval(iv);
  }, []);

  // Live 1s tick for the countdown (only when we know the exact time).
  useEffect(() => {
    if (nextAt == null) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [nextAt]);

  const countdown = (() => {
    if (nextAt == null) return null;
    const ms = Math.max(0, nextAt - now);
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${h}:${pad(m)}:${pad(s)}`;
  })();

  useEffect(() => {
    setPlan(null);
  }, [mode, prayer, rakahs]);

  async function aqim() {
    setLoading(true);
    setError(null);
    const started = Date.now();
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, prayer, rakahs }),
      });
      const data = await res.json();
      // Let the sujood animation complete its current cycle before revealing —
      // the dot always reaches the ground and rises (LogoLoader dur = 1.8s).
      const CYCLE = 1800;
      const elapsed = Date.now() - started;
      await new Promise((r) => setTimeout(r, CYCLE - (elapsed % CYCLE)));
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
        {/* Not set up yet → the setup call leads the page */}
        {status && !status.hasMemorization && (
          <Link
            href="/setup"
            className="flex items-center gap-3 card p-4 bg-accent-soft border-accent/30 active:scale-[0.99] transition animate-rise"
          >
            <Sparkles size={18} className="text-accent shrink-0" />
            <span className="text-sm">{t("home.setMemoFirst")}</span>
          </Link>
        )}

        {/* INFO CARD — next prayer at a glance (informational only) */}
        <section className="relative overflow-hidden rounded-2xl bg-primary text-white p-6 animate-rise">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-white/70">
              {t("home.nextPrayer")}
            </span>
            {hijri && <span className="text-[11px] text-white/60">{hijri}</span>}
          </div>
          <div className="flex items-end justify-between gap-4 mt-1">
            <h1 className="font-heading text-[2.6rem] leading-tight">
              {heroKey === "qiyam" ? t("mode.qiyam") : t(`prayer.${heroKey}`)}
            </h1>
            {countdown && (
              <div className="text-end pb-2">
                <div className="text-[10px] text-white/60">
                  {t("home.remaining")}
                </div>
                <div
                  className="text-2xl font-bold tabular-nums tracking-wide"
                  dir="ltr"
                >
                  {countdown}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Ayah of the day — the designed highlight */}
        {daily && status?.hasMemorization && (
          <ContentCard
            label={t("home.dailyAyah")}
            icon={<Sparkles size={13} />}
            reference={
              <>
                {t("passage.surah")}{" "}
                {surahName(lang, daily.surahNameArabic, daily.surahNameTranslit)}{" "}
                · {t("passage.ayah")} {daily.ayahNumber}
              </>
            }
          >
            <p
              className="font-quran text-xl leading-[2.1] text-foreground"
              dir="rtl"
            >
              {cleanAyah(daily.arabicText)}
            </p>
            {lang === "en" && daily.translation && (
              <p className="text-xs text-muted italic mt-2" dir="ltr">
                “{daily.translation}”
              </p>
            )}
          </ContentCard>
        )}

        {/* SELECTION — pick what to recite (the action) */}
        <section className="card p-4 sm:p-5 space-y-4">
          <h2 className="text-sm font-bold">{t("home.pickVerses")}</h2>

          <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar snap-x">
            {CHIPS.map((c) => {
              const on = prayer === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => {
                    setPrayer(c.key);
                    setMode(c.mode);
                  }}
                  data-on={on}
                  className="pill px-4 py-2 text-sm font-medium whitespace-nowrap snap-start shrink-0 active:scale-[0.97]"
                >
                  {c.key === "qiyam" ? t("mode.qiyam") : t(`prayer.${c.key}`)}
                </button>
              );
            })}
          </div>

          {showRakahInput && (
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5">
              <span className="text-sm text-muted">{t("home.rakahs")}</span>
              <Stepper value={rakahs} onChange={setRakahs} min={1} max={20} />
            </div>
          )}

          <button
            onClick={aqim}
            disabled={loading}
            className="btn-cta w-full py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <LogoLoader size={30} inherit className="text-white" />
            ) : (
              // Heading font (Amiri): same classical look as the Quran face but
              // with sane vertical metrics, so the word centers perfectly.
              <span className="font-heading font-bold text-2xl leading-none">
                أقِم
              </span>
            )}
          </button>

          {error && (
            <div className="text-sm text-primary text-center bg-primary-soft rounded-xl p-3">
              {error}
            </div>
          )}
        </section>
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
            {busy ? (
              <LogoLoader size={18} className="text-primary" />
            ) : (
              <RefreshCw size={15} />
            )}
            {t("home.suggestAnother")}
          </button>
        </div>
      )}
    </div>
  );
}
