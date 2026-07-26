"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  BookOpenText,
  MapPin,
  RefreshCw,
  Check,
  Sparkles,
  Flame,
  ChevronLeft,
  ScrollText,
  ListChecks,
  History,
} from "lucide-react";
import { LogoLoader } from "@/components/Logo";
import { PageLoader } from "@/components/Brand";
import { ContentCard } from "@/components/ContentCard";
import { PassageCard } from "@/components/PassageCard";
import {
  isDoneToday,
  currentStreak,
  loadWird,
  isAdhkarDoneToday,
} from "@/lib/wird";
import {
  computeTimes,
  loadReminderConfig,
  saveReminderConfig,
} from "@/lib/reminder";
import { focusPayload } from "@/lib/focus";
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
  const [showOther, setShowOther] = useState(false);
  const [plan, setPlan] = useState<ResolvedPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyAyah | null>(null);
  const [lenPref, setLenPref] = useState<string>("medium");
  useEffect(() => {
    try {
      setLenPref(localStorage.getItem("aqim-passage-len") || "medium");
    } catch {}
  }, []);

  // Everything renders at once, in a fixed order, only after the core data
  // has settled — no sections popping in one by one.
  const [booted, setBooted] = useState(false);
  useEffect(() => {
    Promise.allSettled([
      fetch("/api/status")
        .then((r) => r.json())
        .then((d) =>
          setStatus({ seeded: d.seeded, hasMemorization: d.hasMemorization }),
        )
        .catch(() => setStatus({ seeded: false, hasMemorization: false })),
      fetch("/api/daily-ayah")
        .then((r) => r.json())
        .then((d) => setDaily(d.ayah))
        .catch(() => {}),
    ]).finally(() => setBooted(true));
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

  // Prayer times (today + tomorrow), computed on-device when a location is
  // saved. The countdown follows whichever prayer tab is SELECTED — pick العصر
  // and you see time until Asr, even if Dhuhr is chronologically next.
  const [times, setTimes] = useState<{
    today: ReturnType<typeof computeTimes>;
    tomorrow: ReturnType<typeof computeTimes>;
  } | null>(null);
  const [nextKey, setNextKey] = useState<string | null>(null);
  const [hasLocation, setHasLocation] = useState(true); // assume until checked
  const [locCtaDismissed, setLocCtaDismissed] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  function loadTimes() {
    const cfg = loadReminderConfig();
    if (cfg.lat == null || cfg.lng == null) {
      setHasLocation(false);
      return false;
    }
    setHasLocation(true);
    const today = computeTimes(cfg.lat, cfg.lng, cfg.method, new Date());
    const tm = new Date();
    tm.setDate(tm.getDate() + 1);
    const tomorrow = computeTimes(cfg.lat, cfg.lng, cfg.method, tm);
    setTimes({ today, tomorrow });
    // Chronologically next prayer → initial tab selection.
    const nowMs = Date.now();
    for (const day of [today, tomorrow]) {
      for (const k of ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const) {
        if (day[k].getTime() > nowMs) {
          setNextKey(k);
          setPrayer(k);
          setMode("faraid");
          return true;
        }
      }
    }
    return true;
  }

  useEffect(() => {
    const p = defaultPrayer();
    setPrayer(p);
    setMode(CHIPS.find((c) => c.key === p)?.mode ?? "faraid");
    loadTimes();
    try {
      setLocCtaDismissed(localStorage.getItem("aqim-loccta") === "1");
    } catch {
      setLocCtaDismissed(false);
    }
  }, []);

  // Live 1s tick while we can show a countdown.
  useEffect(() => {
    if (!times) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [times]);

  // Which real prayer time the selected chip maps to (sunnahs → their prayer).
  const TIME_KEY: Record<string, keyof ReturnType<typeof computeTimes> | null> =
    {
      fajr: "fajr",
      dhuhr: "dhuhr",
      asr: "asr",
      maghrib: "maghrib",
      isha: "isha",
      "fajr-sunnah": "fajr",
      "dhuhr-nafl": "dhuhr",
      "maghrib-sunnah": "maghrib",
      "isha-shaf": "isha",
      witr: "isha",
      free: null,
      qiyam: "fajr", // night prayer ends at Fajr — count down to it
    };

  const countdown = (() => {
    if (!times) return null;
    const k = TIME_KEY[prayer];
    if (!k) return null;
    const todayAt = times.today[k].getTime();
    const target = todayAt > now ? todayAt : times.tomorrow[k].getTime();
    const ms = Math.max(0, target - now);
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${h}:${pad(m)}:${pad(s)}`;
  })();

  const [locBusy, setLocBusy] = useState(false);
  const [locError, setLocError] = useState(false);

  function enableLocation() {
    setLocError(false);
    setLocBusy(true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const cfg = loadReminderConfig();
        saveReminderConfig({
          ...cfg,
          lat: Math.round(pos.coords.latitude * 100) / 100,
          lng: Math.round(pos.coords.longitude * 100) / 100,
          locationLabel: null,
        });
        loadTimes();
        setLocBusy(false);
      },
      () => {
        setLocBusy(false);
        setLocError(true);
      },
      { timeout: 12000, maximumAge: 600000 },
    );
  }


  useEffect(() => {
    setPlan(null);
  }, [mode, prayer, rakahs]);

  // Keep the selected chip visible inside its scrolling row.
  const chipsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = chipsRef.current?.querySelector('[data-on="true"]');
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [prayer, booted]);

  // On phones the suggestions render below the fold — bring them into view.
  const resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (plan && window.innerWidth < 1024) {
      setTimeout(
        () =>
          resultsRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        80,
      );
    }
  }, [plan]);

  async function aqim() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          prayer,
          rakahs,
          focus: focusPayload(),
          lengthPref: localStorage.getItem("aqim-passage-len") || "medium",
        }),
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

  if (!booted) return <PageLoader />;

  return (
    <div className="pt-2 lg:grid lg:grid-cols-[minmax(340px,400px)_1fr] lg:gap-8 lg:items-start">
      {/* Controls column — fixed, deliberate order */}
      <div className="space-y-6 lg:sticky lg:top-20">
        {/* ONE hero: either get-started (new user) or the prayer card */}
        {status && !status.hasMemorization ? (
          <section className="rounded-[1.75rem] bg-accent-soft p-6 space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-[11px] font-bold text-accent">
              <Sparkles size={12} />
              {t("home.getStarted.title")}
            </span>
            <ol className="space-y-2.5">
              {[t("home.getStarted.s1"), t("home.getStarted.s2")].map(
                (step, i) => (
                  <li key={i} className="flex items-start gap-3 text-[15px]">
                    <span className="w-6 h-6 rounded-full bg-surface grid place-items-center text-xs font-bold text-accent shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ),
              )}
            </ol>
            <Link
              href="/setup"
              className="btn-cta w-full !rounded-full py-3.5 text-base flex items-center justify-center"
            >
              {t("home.getStarted.btn")}
            </Link>
          </section>
        ) : (
          <section className="rounded-[1.75rem] bg-primary text-white p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-white/60">
                  {prayer === nextKey || !times
                    ? t("home.nextPrayer")
                    : t("home.selectedPrayer")}
                  {hijri ? ` · ${hijri}` : ""}
                </div>
                <div className="text-3xl font-bold leading-tight truncate">
                  {prayer === "qiyam" ? t("mode.qiyam") : t(`prayer.${prayer}`)}
                </div>
              </div>
              {countdown ? (
                <div className="text-end shrink-0">
                  <div className="text-[10px] text-white/60">
                    {t("home.remaining")}
                  </div>
                  <div
                    className="text-xl font-bold tabular-nums tracking-wide"
                    dir="ltr"
                  >
                    {countdown}
                  </div>
                </div>
              ) : (
                !hasLocation &&
                !locCtaDismissed && (
                  <button
                    onClick={enableLocation}
                    disabled={locBusy}
                    className="shrink-0 flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold disabled:opacity-60"
                  >
                    <MapPin size={12} className={locBusy ? "animate-pulse" : ""} />
                    {t("home.locCta.btn")}
                  </button>
                )
              )}
            </div>

            {showRakahInput && (
              <div className="flex items-center justify-between rounded-xl border border-white/25 px-4 py-2.5">
                <span className="text-sm text-white/80">{t("home.rakahs")}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setRakahs(Math.max(1, rakahs - 1))}
                    className="w-8 h-8 rounded-full border border-white/40 grid place-items-center text-lg active:scale-90 transition"
                    aria-label="-"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-bold tabular-nums">
                    {rakahs}
                  </span>
                  <button
                    onClick={() => setRakahs(Math.min(20, rakahs + 1))}
                    className="w-8 h-8 rounded-full bg-white text-primary grid place-items-center text-lg active:scale-90 transition"
                    aria-label="+"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {locError && (
              <p className="text-[11px] text-white/75 bg-white/10 rounded-xl p-2.5 text-center">
                {t("home.locFailed")}
              </p>
            )}

            {/* Passage length — the same setting as in Settings, surfaced
                where it matters most */}
            <div className="flex items-center justify-center gap-1 rounded-full bg-white/10 p-1">
              {(["short", "medium", "long"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setLenPref(v);
                    try {
                      localStorage.setItem("aqim-passage-len", v);
                    } catch {}
                  }}
                  aria-pressed={lenPref === v}
                  className={`flex-1 rounded-full py-1.5 text-xs font-bold transition ${
                    lenPref === v ? "bg-white text-primary" : "text-white/70"
                  }`}
                >
                  {t(`len.${v}`)}
                </button>
              ))}
            </div>

            <button
              onClick={aqim}
              disabled={loading}
              className="btn-cta w-full !rounded-full py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <LogoLoader size={30} inherit className="text-white" />
              ) : (
                <span className="font-bold text-2xl leading-none">
                  أقِم
                </span>
              )}
            </button>
            <p className="text-[11px] text-white/60 text-center -mt-1">
              {t("home.ctaHint")}
            </p>

            {error && (
              <div className="text-sm text-white bg-white/10 text-center rounded-xl p-3">
                {error}
              </div>
            )}

            <div className="text-center">
              <button
                onClick={() => setShowOther(!showOther)}
                className="text-xs font-bold text-white/60 hover:text-white"
              >
                {t("home.otherPrayer")}
              </button>
            </div>
            {showOther && (
              <div
                ref={chipsRef}
                className="-mx-6 px-6 flex gap-2 overflow-x-auto no-scrollbar snap-x"
              >
                {CHIPS.map((c) => {
                  const on = prayer === c.key;
                  return (
                    <button
                      key={c.key}
                      onClick={() => {
                        setPrayer(c.key);
                        setMode(c.mode);
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap snap-start shrink-0 active:scale-[0.97] transition ${
                        on
                          ? "bg-white text-primary font-bold"
                          : "bg-white/10 text-white/85"
                      }`}
                    >
                      {c.key === "qiyam" ? t("mode.qiyam") : t(`prayer.${c.key}`)}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* آية اليوم */}
        {daily && (
          <ContentCard
            label={t("home.dailyAyah")}
            icon={<BookOpen size={13} />}
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

        {/* Today's tasks — wird + adhkar at a glance */}
        <TodayCard />

        {/* Pick up the Mushaf where the reader left off */}
        <ContinueReading />

        {/* Every section of the app, one tap away */}
        <QuickGrid />
      </div>

      {/* Results column */}
      <div ref={resultsRef} className="mt-6 lg:mt-0 scroll-mt-20">
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


// Today's tasks — the wird and the adhkar, each with its done state, so the
// home page always shows what is left to do today. Full controls stay on
// their own tabs.
function TodayCard() {
  const { t } = useLang();
  const [state, setState] = useState<{
    wirdOn: boolean;
    wirdDone: boolean;
    streak: number;
    adhkarDone: boolean;
  } | null>(null);

  useEffect(() => {
    const read = () =>
      setState({
        wirdOn: loadWird().enabled,
        wirdDone: isDoneToday(),
        streak: currentStreak(),
        adhkarDone: isAdhkarDoneToday(),
      });
    read();
    window.addEventListener("aqim-wird-changed", read);
    return () => window.removeEventListener("aqim-wird-changed", read);
  }, []);

  if (!state) return null;

  const Row = ({
    href,
    done,
    label,
    trailing,
  }: {
    href: string;
    done: boolean;
    label: string;
    trailing?: React.ReactNode;
  }) => (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 px-4 py-3 active:scale-[0.99] transition hover:bg-surface-2"
    >
      <span className="flex items-center gap-2.5 text-sm font-medium min-w-0">
        <span
          className={`w-6 h-6 rounded-full grid place-items-center shrink-0 ${
            done
              ? "bg-secondary text-white"
              : "bg-surface-2 border border-border"
          }`}
        >
          {done && <Check size={13} strokeWidth={3} />}
        </span>
        <span className={`truncate ${done ? "text-muted line-through" : ""}`}>
          {label}
        </span>
      </span>
      <span className="flex items-center gap-2 shrink-0 text-xs text-muted">
        {trailing}
        <ChevronLeft size={15} className="rtl:block hidden" />
      </span>
    </Link>
  );

  return (
    <section className="card rounded-2xl overflow-hidden">
      <div className="px-4 pt-3 pb-1 text-xs font-bold text-muted">
        {t("home.todos")}
      </div>
      <div className="divide-y divide-border">
        <Row
          href="/quran"
          done={state.wirdOn && state.wirdDone}
          label={
            !state.wirdOn
              ? t("home.todo.setupWird")
              : state.wirdDone
                ? t("wird.doneToday")
                : t("home.todo.wird")
          }
          trailing={
            state.wirdOn && state.streak > 0 ? (
              <span className="flex items-center gap-1 text-accent font-bold">
                <Flame size={13} />
                {state.streak}
              </span>
            ) : undefined
          }
        />
        <Row
          href="/adhkar"
          done={state.adhkarDone}
          label={
            state.adhkarDone ? t("adhkar.doneToday") : t("home.todo.adhkar")
          }
        />
      </div>
    </section>
  );
}

// Resume the Mushaf exactly where the reader stopped; before they've started,
// the same card invites them to begin from page one.
function ContinueReading() {
  const { t, lang } = useLang();
  const [page, setPage] = useState<number>(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const p = Number(localStorage.getItem("aqim-quran-page")) || 0;
      if (p > 1) setPage(Math.min(604, p));
    } catch {}
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!page) {
    return (
      <Link
        href="/quran"
        className="card rounded-2xl p-4 flex items-center gap-3 active:scale-[0.99] transition hover:border-accent/50"
      >
        <span className="w-10 h-10 rounded-xl bg-accent-soft text-accent grid place-items-center shrink-0">
          <BookOpenText size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold truncate">
            {t("home.startReading")}
          </span>
          <span className="block text-[11px] text-muted mt-0.5">
            {t("home.startReadingSub")}
          </span>
        </span>
        <ChevronLeft size={16} className="text-muted rtl:block hidden shrink-0" />
      </Link>
    );
  }

  const digits = (n: number) =>
    lang === "ar"
      ? String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)])
      : String(n);

  return (
    <Link
      href="/quran"
      className="card rounded-2xl p-4 flex items-center gap-3 active:scale-[0.99] transition hover:border-accent/50"
    >
      <span className="w-10 h-10 rounded-xl bg-accent-soft text-accent grid place-items-center shrink-0">
        <BookOpenText size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold truncate">
          {t("home.continueReading")}
        </span>
        <span className="block text-[11px] text-muted mt-0.5">
          {t("quran.page")} {digits(page)} / {digits(604)}
        </span>
        <span className="block h-1 rounded-full bg-surface-2 overflow-hidden mt-1.5">
          <span
            className="block h-full rounded-full bg-accent"
            style={{ width: `${(page / 604) * 100}%` }}
          />
        </span>
      </span>
      <ChevronLeft size={16} className="text-muted rtl:block hidden shrink-0" />
    </Link>
  );
}

// One tile per section — the whole app reachable from the home page.
function QuickGrid() {
  const { t } = useLang();
  const tiles = [
    {
      href: "/quran",
      icon: <BookOpenText size={18} />,
      title: t("nav.quran"),
      sub: t("home.quick.quran"),
    },
    {
      href: "/adhkar",
      icon: <ScrollText size={18} />,
      title: t("nav.adhkar"),
      sub: t("home.quick.adhkar"),
    },
    {
      href: "/setup",
      icon: <ListChecks size={18} />,
      title: t("nav.setup"),
      sub: t("home.quick.setup"),
    },
    {
      href: "/history",
      icon: <History size={18} />,
      title: t("nav.history"),
      sub: t("home.quick.history"),
    },
  ];
  return (
    <section>
      <div className="text-xs font-bold text-muted mb-2 px-1">
        {t("home.quick")}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map((tl) => (
          <Link
            key={tl.href}
            href={tl.href}
            className="card rounded-2xl p-4 active:scale-[0.97] transition hover:border-primary/40"
          >
            <span className="w-9 h-9 rounded-xl bg-primary-soft text-primary grid place-items-center mb-2.5">
              {tl.icon}
            </span>
            <span className="block text-sm font-bold leading-snug">
              {tl.title}
            </span>
            <span className="block text-[11px] text-muted mt-0.5 leading-snug">
              {tl.sub}
            </span>
          </Link>
        ))}
      </div>
    </section>
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
        <h2 className="text-xl font-bold text-primary">
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
        body: JSON.stringify({
          mode,
          exclude,
          focus: focusPayload(),
          lengthPref: localStorage.getItem("aqim-passage-len") || "medium",
        }),
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
