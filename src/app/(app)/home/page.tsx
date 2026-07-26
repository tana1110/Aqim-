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
} from "lucide-react";
import { Logo, LogoLoader } from "@/components/Logo";
import { PageLoader } from "@/components/Brand";
import { ContentCard } from "@/components/ContentCard";
import { PassageCard } from "@/components/PassageCard";
import {
  isDoneToday,
  currentStreak,
  loadWird,
  isAdhkarDoneToday,
  adhkarPartsToday,
} from "@/lib/wird";
import { loadTasbih, tapTasbih, type TasbihState } from "@/lib/tasbih";
import {
  computeTimes,
  loadReminderConfig,
  saveReminderConfig,
} from "@/lib/reminder";
import {
  focusPayload,
  loadFocus,
  saveFocus,
  type FocusConfig,
} from "@/lib/focus";
import { useLang } from "@/components/LanguageProvider";
import { surahName, cleanAyah } from "@/lib/quranDisplay";
import type {
  Mode,
  PassageContent,
  ResolvedPlan,
  SurahMeta,
} from "@/lib/types";

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
  // Passage length is asked once; afterwards it's a Settings-only control.
  const [lenChosen, setLenChosen] = useState(true);
  useEffect(() => {
    try {
      setLenChosen(!!localStorage.getItem("aqim-passage-len"));
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
        // A network failure is NOT "not seeded" — degrade gracefully instead
        // of dead-ending the user on the not-ready screen.
        .catch(() => setStatus(null)),
      fetch("/api/daily-ayah")
        .then((r) => r.json())
        .then((d) => setDaily(d.ayah))
        .catch(() => {}),
    ]).finally(() => setBooted(true));
  }, []);

  // Signed-in name (optional) — warms up the greeting.
  const [acctName, setAcctName] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setAcctName(d.account?.name ?? null))
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

  // The countdown is HONEST: always to the chronologically next prayer,
  // regardless of which prayer is selected for suggestions below.
  const countdown = (() => {
    if (!times || !nextKey) return null;
    const k = nextKey as keyof ReturnType<typeof computeTimes>;
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


  // Discard in-flight suggestions when the request context changes — an old
  // response must never repopulate a cleared plan (it would log corrupted
  // history entries).
  const suggestSeq = useRef(0);
  useEffect(() => {
    suggestSeq.current++;
    setPlan(null);
  }, [mode, prayer, rakahs]);

  // If the selected prayer isn't one of the 5 always-visible fard chips,
  // expand the row so the selection is never invisible.
  useEffect(() => {
    if (!CHIPS.slice(0, 5).some((c) => c.key === prayer)) setShowOther(true);
  }, [prayer]);

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
    const seq = suggestSeq.current;
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
      if (seq !== suggestSeq.current) return; // context changed mid-flight
      if (data.error) setError(data.error);
      else setPlan(data.plan);
    } catch {
      if (seq === suggestSeq.current) setError(t("home.error"));
    } finally {
      if (seq === suggestSeq.current) setLoading(false);
    }
  }

  if (status && !status.seeded) {
    return (
      <div className="card p-6 text-center mt-6">
        <h1 className="text-lg font-bold mb-2">{t("db.notReady.title")}</h1>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary px-6 py-2 text-sm mt-2"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  const showRakahInput =
    mode === "qiyam" || (mode === "nafl" && prayer === "free");

  if (!booted) return <PageLoader />;

  return (
    <div className="pt-2 lg:grid lg:grid-cols-[minmax(340px,400px)_1fr] lg:gap-8 lg:items-start">
      {/* Controls column — fixed, deliberate order */}
      <div className="space-y-5 lg:sticky lg:top-20">
        {/* Greeting — like a native app's warm header */}
        <div className="flex items-center gap-3 px-1">
          <span className="w-11 h-11 rounded-full bg-surface shadow-sm grid place-items-center shrink-0">
            <Logo variant="icon" size={26} />
          </span>
          <div className="min-w-0">
            <div className="text-lg font-extrabold leading-tight truncate">
              {t("home.greeting")}
              {acctName ? (lang === "ar" ? `، ${acctName}` : `, ${acctName}`) : ""}
            </div>
            {hijri && <div className="text-xs text-muted">{hijri}</div>}
          </div>
        </div>
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
          <section className="tile tile-blue p-6 space-y-4">
            {/* Next prayer — always the chronological truth */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-muted">
                  {t("home.nextPrayer")}
                </div>
                <div className="text-3xl font-extrabold leading-tight truncate text-primary">
                  {nextKey
                    ? t(`prayer.${nextKey}`)
                    : prayer === "qiyam"
                      ? t("mode.qiyam")
                      : t(`prayer.${prayer}`)}
                </div>
              </div>
              {countdown ? (
                <div className="text-end shrink-0 rounded-2xl bg-surface px-3.5 py-2 shadow-sm">
                  <div className="text-[10px] text-muted">
                    {t("home.remaining")}
                  </div>
                  <div
                    className="text-lg font-bold tabular-nums tracking-wide text-primary"
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
                    className="shrink-0 flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[11px] font-bold text-primary shadow-sm disabled:opacity-60"
                  >
                    <MapPin size={12} className={locBusy ? "animate-pulse" : ""} />
                    {t("home.locCta.btn")}
                  </button>
                )
              )}
            </div>

            {/* Which prayer to suggest for — round chips, like a day picker */}
            <div>
              <div className="text-[11px] font-bold text-muted mb-2">
                {t("home.pickPrayer")}
              </div>
              <div
                ref={chipsRef}
                className="-mx-6 px-6 flex gap-2.5 overflow-x-auto no-scrollbar snap-x"
              >
                {(showOther ? CHIPS : CHIPS.slice(0, 5)).map((c) => {
                  const on = prayer === c.key;
                  return (
                    <button
                      key={c.key}
                      onClick={() => {
                        setPrayer(c.key);
                        setMode(c.mode);
                      }}
                      data-on={on}
                      className={`w-16 h-16 rounded-full grid place-items-center text-[13px] font-bold leading-tight text-center whitespace-normal snap-start shrink-0 active:scale-[0.95] transition shadow-sm ${
                        on
                          ? "bg-primary text-white scale-105"
                          : "bg-surface text-foreground"
                      }`}
                    >
                      {c.key === "qiyam" ? t("mode.qiyam") : t(`prayer.${c.key}`)}
                    </button>
                  );
                })}
                {!showOther && (
                  <button
                    onClick={() => setShowOther(true)}
                    className="w-16 h-16 rounded-full grid place-items-center text-[13px] font-bold snap-start shrink-0 bg-surface/60 text-muted shadow-sm"
                  >
                    {t("home.more")}
                  </button>
                )}
              </div>
            </div>

            {showRakahInput && (
              <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-2.5 shadow-sm">
                <span className="text-sm text-muted">{t("home.rakahs")}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setRakahs(Math.max(1, rakahs - 1))}
                    className="w-8 h-8 rounded-full border border-border grid place-items-center text-lg active:scale-90 transition"
                    aria-label="-"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-bold tabular-nums">
                    {rakahs}
                  </span>
                  <button
                    onClick={() => setRakahs(Math.min(20, rakahs + 1))}
                    className="w-8 h-8 rounded-full bg-primary text-white grid place-items-center text-lg active:scale-90 transition"
                    aria-label="+"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {locError && (
              <p className="text-[11px] text-muted bg-surface rounded-2xl p-2.5 text-center">
                {t("home.locFailed")}
              </p>
            )}

            {/* Passage length — asked ONCE, then it lives in Settings only */}
            {!lenChosen && (
              <div className="rounded-2xl bg-surface p-3 space-y-2 shadow-sm">
                <div className="text-xs font-bold">{t("home.lenAsk")}</div>
                <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1">
                  {(["short", "medium", "long"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        setLenChosen(true);
                        try {
                          localStorage.setItem("aqim-passage-len", v);
                        } catch {}
                      }}
                      className="flex-1 rounded-full py-1.5 text-xs font-bold text-muted hover:bg-primary hover:text-white transition"
                    >
                      {t(`len.${v}`)}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-muted">
                  {t("home.lenAskHint")}
                </div>
              </div>
            )}

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

            {error && (
              <div className="text-sm text-foreground bg-surface text-center rounded-2xl p-3 shadow-sm">
                {error}
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

        {/* Today's tasks — bento tiles */}
        <TodayCard />

        {/* Quick misbaha — count right here, full page one tap away */}
        <MisbahaMini />

        {/* Pick up the Mushaf where the reader left off */}
        <ContinueReading />

        {/* Review — the user picks what to review (drives Focus mode) */}
        {status?.hasMemorization && <ReviewPicker />}
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


// Today's tasks — bento tiles: the wird (gold) and the daily adhkar cycle
// (blue), each with its live state. Full controls stay on their own tabs.
function TodayCard() {
  const { t } = useLang();
  const [state, setState] = useState<{
    wirdOn: boolean;
    wirdDone: boolean;
    streak: number;
    adhkarDone: boolean;
    adhkarParts: boolean[];
  } | null>(null);

  useEffect(() => {
    const read = () => {
      const parts = adhkarPartsToday();
      setState({
        wirdOn: loadWird().enabled,
        wirdDone: isDoneToday(),
        streak: currentStreak(),
        adhkarDone: isAdhkarDoneToday(),
        adhkarParts: [parts.morning, parts.evening, parts.sleep],
      });
    };
    read();
    window.addEventListener("aqim-wird-changed", read);
    return () => window.removeEventListener("aqim-wird-changed", read);
  }, []);

  if (!state) return null;
  const partsDone = state.adhkarParts.filter(Boolean).length;

  return (
    <section className="space-y-2.5">
      <div className="section-title px-1">{t("home.todos")}</div>
      <div className="grid grid-cols-2 gap-3">
        {/* Wird tile */}
        <Link
          href={state.wirdOn ? "/quran" : "/adhkar"}
          className="tile tile-gold p-4 min-h-36 flex flex-col justify-between active:scale-[0.98] transition"
        >
          <span className="flex items-center justify-between">
            <span
              className={`w-7 h-7 rounded-full grid place-items-center ${
                state.wirdOn && state.wirdDone
                  ? "bg-secondary text-white"
                  : "bg-surface"
              }`}
            >
              {state.wirdOn && state.wirdDone && (
                <Check size={14} strokeWidth={3} />
              )}
            </span>
            {state.wirdOn && state.streak > 0 && (
              <span className="flex items-center gap-1 text-accent font-bold text-sm">
                <Flame size={15} />
                {state.streak}
              </span>
            )}
          </span>
          <span>
            <span className="block text-[15px] font-extrabold leading-snug">
              {!state.wirdOn
                ? t("home.todo.setupWird")
                : state.wirdDone
                  ? t("wird.doneToday")
                  : t("home.todo.wird")}
            </span>
          </span>
        </Link>

        {/* Adhkar tile — the 3-part daily cycle */}
        <Link
          href="/adhkar"
          className="tile tile-blue p-4 min-h-36 flex flex-col justify-between active:scale-[0.98] transition"
        >
          <span className="flex items-center justify-between">
            {state.adhkarDone ? (
              <span className="w-7 h-7 rounded-full bg-secondary text-white grid place-items-center">
                <Check size={14} strokeWidth={3} />
              </span>
            ) : (
              <span className="w-7 h-7 grid place-items-center">
                <CycleRing parts={state.adhkarParts} />
              </span>
            )}
            {!state.adhkarDone && partsDone > 0 && (
              <span className="text-sm font-bold text-primary tabular-nums">
                {partsDone}/3
              </span>
            )}
          </span>
          <span className="block text-[15px] font-extrabold leading-snug">
            {state.adhkarDone ? t("adhkar.doneToday") : t("home.todo.adhkar")}
          </span>
        </Link>
      </div>
    </section>
  );
}

// The daily adhkar cycle: three arc segments (morning, evening, sleep) —
// each turns green as its chapter is finished.
function CycleRing({ parts }: { parts: boolean[] }) {
  const r = 9;
  const cx = 12;
  const cy = 12;
  const gap = 28; // degrees of breathing room between segments
  const seg = 120 - gap;
  const arc = (i: number) => {
    const start = ((-90 + i * 120 + gap / 2) * Math.PI) / 180;
    const end = ((-90 + i * 120 + gap / 2 + seg) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" className="shrink-0">
      {parts.map((on, i) => (
        <path
          key={i}
          d={arc(i)}
          fill="none"
          strokeWidth={3}
          strokeLinecap="round"
          className={on ? "stroke-[var(--color-secondary)]" : "stroke-[var(--color-border)]"}
        />
      ))}
    </svg>
  );
}

// Home misbaha: tap the bead right on the home page; the full page (choose
// dhikr, target, rounds) is one tap away.
function MisbahaMini() {
  const { t, lang } = useLang();
  const [s, setS] = useState<TasbihState | null>(null);

  useEffect(() => {
    const read = () => setS(loadTasbih());
    read();
    window.addEventListener("aqim-tasbih-changed", read);
    return () => window.removeEventListener("aqim-tasbih-changed", read);
  }, []);

  if (!s) return null;
  const digits = (n: number) =>
    lang === "ar"
      ? String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)])
      : String(n);

  return (
    <section className="tile tile-teal p-4 flex items-center gap-4">
      <button
        onClick={() => {
          const { next, cycled } = tapTasbih(s);
          setS(next);
          try {
            navigator.vibrate?.(cycled ? [40, 60, 40] : 12);
          } catch {}
        }}
        aria-label={t("tasbih.tap")}
        className="w-20 h-20 rounded-full bg-secondary text-white grid place-items-center shrink-0 active:scale-[0.93] transition select-none shadow-md"
      >
        <span className="text-2xl font-bold tabular-nums">{digits(s.count)}</span>
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold text-muted mb-0.5">
          {t("tasbih.title")}
        </div>
        <div className="font-quran text-lg text-primary truncate" dir="rtl">
          {s.phrase}
        </div>
        <div className="text-[11px] text-muted tabular-nums mt-0.5">
          {s.target > 0 ? `${digits(s.count)} / ${digits(s.target)} · ` : ""}
          {t("tasbih.rounds")}: {digits(s.rounds)}
        </div>
      </div>
      <Link
        href="/tasbih"
        className="shrink-0 text-xs font-bold text-primary hover:underline"
      >
        {t("home.tasbih.open")}
      </Link>
    </section>
  );
}

// Review — the USER decides what to review: pick a memorized surah and the
// prayer suggestions lean into it (Focus mode) until turned off.
function ReviewPicker() {
  const { t, lang } = useLang();
  const [cfg, setCfg] = useState<FocusConfig | null>(null);
  const [choices, setChoices] = useState<
    { n: number; name: string; lo: number; hi: number }[]
  >([]);
  const [sel, setSel] = useState<number | "">("");

  useEffect(() => {
    setCfg(loadFocus());
    Promise.all([
      fetch("/api/memorization").then((r) => r.json()),
      fetch("/api/surahs").then((r) => r.json()),
    ])
      .then(([m, s]) => {
        const surahs: SurahMeta[] = s.surahs ?? [];
        const by = new Map<number, { lo: number; hi: number }>();
        for (const r of m.memorization ?? []) {
          const cur = by.get(r.surahNumber);
          if (!cur) by.set(r.surahNumber, { lo: r.fromAyah, hi: r.toAyah });
          else {
            cur.lo = Math.min(cur.lo, r.fromAyah);
            cur.hi = Math.max(cur.hi, r.toAyah);
          }
        }
        setChoices(
          [...by.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([n, b]) => {
              const meta = surahs.find((x) => x.number === n);
              return {
                n,
                name: meta
                  ? surahName(lang, meta.nameArabic, meta.nameTranslit)
                  : String(n),
                lo: b.lo,
                hi: b.hi,
              };
            }),
        );
      })
      .catch(() => {});
  }, [lang]);

  if (!cfg || choices.length === 0) return null;

  function start() {
    const c = choices.find((x) => x.n === sel);
    if (!c) return;
    const next = {
      ...cfg!,
      active: true,
      surahNumber: c.n,
      fromAyah: c.lo,
      toAyah: c.hi,
    };
    setCfg(next);
    saveFocus(next);
  }
  function stop() {
    const next = { ...cfg!, active: false };
    setCfg(next);
    saveFocus(next);
  }

  return (
    <section className="card p-4 space-y-3">
      <div className="section-title">{t("home.review.title")}</div>
      {cfg.active && cfg.surahNumber ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm min-w-0">
            <span className="text-[11px] text-muted block">{t("review.now")}</span>
            <b>
              {choices.find((c) => c.n === cfg.surahNumber)?.name ??
                cfg.surahNumber}
            </b>
            {cfg.fromAyah != null && cfg.toAyah != null && (
              <span className="text-xs text-muted">
                {" "}
                ({cfg.fromAyah}–{cfg.toAyah})
              </span>
            )}
          </span>
          <button
            onClick={stop}
            className="shrink-0 rounded-full border border-border px-4 py-2 text-xs font-bold text-muted hover:text-foreground"
          >
            {t("focus.disable")}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={sel}
            onChange={(e) => setSel(Number(e.target.value) || "")}
            className="flex-1 min-w-0 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
          >
            <option value="">{t("review.pick")}</option>
            {choices.map((c) => (
              <option key={c.n} value={c.n}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={start}
            disabled={!sel}
            className="btn-primary px-4 py-2.5 text-xs disabled:opacity-50 shrink-0"
          >
            {t("review.start")}
          </button>
        </div>
      )}
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

  const digits = (n: number) =>
    lang === "ar"
      ? String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)])
      : String(n);

  if (!page) {
    return (
      <Link
        href="/quran"
        className="tile tile-ink p-5 flex items-center gap-3 active:scale-[0.98] transition"
      >
        <span className="w-11 h-11 rounded-2xl bg-white/15 grid place-items-center shrink-0">
          <BookOpenText size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-extrabold truncate">
            {t("home.startReading")}
          </span>
          <span className="block text-[11px] text-white/60 mt-0.5">
            {t("home.startReadingSub")}
          </span>
        </span>
        <ChevronLeft size={16} className="text-white/60 rtl:block hidden shrink-0" />
      </Link>
    );
  }

  return (
    <Link
      href="/quran"
      className="tile tile-ink p-5 flex items-center gap-3 active:scale-[0.98] transition"
    >
      <span className="w-11 h-11 rounded-2xl bg-white/15 grid place-items-center shrink-0">
        <BookOpenText size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-extrabold truncate">
          {t("home.continueReading")}
        </span>
        <span className="block text-[11px] text-white/60 mt-0.5">
          {t("quran.page")} {digits(page)} / {digits(604)}
        </span>
        <span className="block h-1 rounded-full bg-white/20 overflow-hidden mt-1.5">
          <span
            className="block h-full rounded-full bg-accent"
            style={{ width: `${(page / 604) * 100}%` }}
          />
        </span>
      </span>
      <ChevronLeft size={16} className="text-white/60 rtl:block hidden shrink-0" />
    </Link>
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

      <p className="text-[11px] text-muted px-1">{t("home.logHint")}</p>

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
  const [entryId, setEntryId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setContent(initial);
    setUsed(false);
    setEntryId(null);
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
    // Already logged? A second tap is the undo.
    if (used && entryId != null) {
      setBusy(true);
      try {
        await fetch(`/api/history?id=${entryId}`, { method: "DELETE" });
        setUsed(false);
        setEntryId(null);
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/history", {
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
      const data = await res.json();
      setEntryId(data.entry?.id ?? null);
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
            disabled={busy}
            className={`flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-1.5 transition ${
              used
                ? "bg-accent-soft text-accent border border-accent/40 rounded-lg"
                : "btn-accent"
            } disabled:opacity-70`}
          >
            {used ? (
              <>
                <Check size={16} /> {t("home.logged")} · {t("home.undo")}
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
