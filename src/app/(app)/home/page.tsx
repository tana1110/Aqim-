"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { Sparkles, RefreshCw, Check, Layers, BookMarked } from "lucide-react";
import { LogoLoader } from "@/components/Logo";
import { PassageCard } from "@/components/PassageCard";
import { MosqueIcon, NafilahIcon, QiyamIcon } from "@/components/ModeIcons";
import { useLang } from "@/components/LanguageProvider";
import { surahName, cleanAyah } from "@/lib/quranDisplay";
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
const MODES: {
  key: Mode;
  Icon: ComponentType<{ size?: number; className?: string }>;
}[] = [
  { key: "faraid", Icon: MosqueIcon },
  { key: "nafl", Icon: NafilahIcon },
  { key: "qiyam", Icon: QiyamIcon },
];

interface DailyAyah {
  surahNumber: number;
  ayahNumber: number;
  arabicText: string;
  surahNameArabic: string;
  surahNameTranslit: string;
  translation: string | null;
}

interface WeekStats {
  totalRecitations: number;
  distinctPassages: number;
  distinctSurahs: number;
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
  const [week, setWeek] = useState<WeekStats | null>(null);

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
    fetch("/api/history/stats")
      .then((r) => r.json())
      .then((d) => setWeek(d.week))
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

        {/* Ayah of the day — first thing on the page, once the account is set up */}
        {daily && status?.hasMemorization && (
          <section className="card p-4 border-s-4 border-s-accent animate-rise">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-accent">
                <Sparkles size={13} />
                {t("home.dailyAyah")}
              </span>
              {hijri && <span className="text-[11px] text-muted">{hijri}</span>}
            </div>
            <p className="font-quran text-lg leading-[2] text-foreground" dir="rtl">
              {cleanAyah(daily.arabicText)}
            </p>
            {lang === "en" && daily.translation && (
              <p className="text-xs text-muted italic mt-1.5" dir="ltr">
                “{daily.translation}”
              </p>
            )}
            <p className="text-[11px] text-muted mt-2">
              {t("passage.surah")}{" "}
              {surahName(lang, daily.surahNameArabic, daily.surahNameTranslit)} ·{" "}
              {t("passage.ayah")} {daily.ayahNumber}
            </p>
          </section>
        )}

        {/* This week */}
        {week && (
          <section>
            <SectionLabel>{t("home.thisWeek")}</SectionLabel>
            <div className="grid grid-cols-3 gap-2.5">
              <MiniStat
                Icon={Sparkles}
                value={week.totalRecitations}
                label={t("home.recitations")}
              />
              <MiniStat
                Icon={Layers}
                value={week.distinctPassages}
                label={t("home.passages")}
              />
              <MiniStat
                Icon={BookMarked}
                value={week.distinctSurahs}
                label={t("home.surahs")}
              />
            </div>
          </section>
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
                    size={24}
                    className={on ? "text-primary" : "text-muted"}
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
          className="btn-cta w-full py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <LogoLoader size={30} inherit className="text-white" />
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

function MiniStat({
  Icon,
  value,
  label,
}: {
  Icon: ComponentType<{ size?: number; className?: string }>;
  value: number;
  label: string;
}) {
  return (
    <div className="card p-3 text-center">
      <Icon size={16} className="text-secondary mx-auto mb-1" />
      <div className="text-xl font-bold tabular-nums leading-none">{value}</div>
      <div className="text-[10px] text-muted mt-1 leading-tight">{label}</div>
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
            <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
            {t("home.suggestAnother")}
          </button>
        </div>
      )}
    </div>
  );
}
