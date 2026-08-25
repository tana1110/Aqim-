"use client";

import { useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, BookOpenText, UserRound } from "lucide-react";
import { Logo } from "@/components/Logo";
import { BrandOverlay } from "@/components/Brand";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLang } from "@/components/LanguageProvider";
import { cleanAyah } from "@/lib/quranDisplay";
import type { Lang } from "@/lib/i18n";
import { applyTheme, type ThemePref } from "@/lib/theme";

const FLAG = "aqim-onboarded";

// The app's welcome (first-run onboarding), shown ONCE per device — like a
// native app's intro. Ends at the memorization picker. Later opens go straight
// to the dashboard and never see this again.
export function Welcome() {
  const { t, lang, setLang } = useLang();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  // Two quick choices come before the tour itself: language, then
  // appearance (dark pre-selected — the app's default look).
  const [phase, setPhase] = useState<"lang" | "theme" | "tour">("lang");
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [ayah, setAyah] = useState<{
    arabic: string | null;
    translation: string | null;
  }>({ arabic: null, translation: null });

  useLayoutEffect(() => {
    try {
      if (!localStorage.getItem(FLAG)) {
        setVisible(true);
        // Wait for the signature verse (or a short timeout) BEFORE showing the
        // slide, so the whole screen enters as one synchronized unit instead
        // of the ayah popping in late.
        const fetchAyah = fetch("/api/slogan-ayah")
          .then((r) => r.json())
          .then(setAyah)
          .catch(() => {});
        Promise.race([
          fetchAyah,
          new Promise((r) => setTimeout(r, 900)),
        ]).finally(() => setReady(true));
      } else {
        // Already onboarded — make sure the paint-blocking cover is down.
        document.documentElement.removeAttribute("data-welcome");
      }
    } catch {}
  }, []);

  if (!visible) return null;

  // Hand-off transition after finishing/skipping — same brand overlay as boot.
  if (leaving) return <BrandOverlay />;

  // Step 1: language — asked before anything else, in both scripts, so an
  // English-only reader can read it too. Neither phase waits on `ready`
  // (the ayah fetch) since neither needs it.
  if (phase === "lang") {
    return (
      <LangStep
        onPick={(l) => {
          setLang(l);
          applyTheme("dark"); // the default the next screen previews live
          setPhase("theme");
        }}
      />
    );
  }

  // Step 2: appearance — dark pre-selected (the app default); tapping an
  // option previews it immediately so the choice is never blind.
  if (phase === "theme") {
    return <ThemeStep t={t} onContinue={() => setPhase("tour")} />;
  }

  // Hold the (already-covered) background until the first slide is complete,
  // so all its elements animate in together.
  if (!ready) return <div className="fixed inset-0 z-40 bg-background" />;

  function finish(toSetup = false) {
    try {
      localStorage.setItem(FLAG, "1");
    } catch {}
    // Lets the home tour start right after the welcome closes.
    window.dispatchEvent(new Event("aqim-onboarded"));
    // Brief brand transition. Finishing the tour goes through the optional
    // sign-in step and then lands on the first real task — marking
    // memorization; skipping goes to the home screen.
    if (toSetup) router.push("/account?next=/setup");
    setLeaving(true);
    setTimeout(() => {
      document.documentElement.removeAttribute("data-welcome");
      setVisible(false);
    }, 1100);
  }

  const slides = [
    {
      art: (
        <div className="flex flex-col items-center gap-4">
          <Logo variant="icon" size={76} />
          <Logo variant={2} size={48} />
        </div>
      ),
      title: t("landing.slogan"),
      body: "", // the slogan says it all — no duplicate sentence beneath
    },
    {
      art: (
        <div className="w-24 h-24 rounded-3xl bg-primary-soft grid place-items-center">
          <BookOpenText size={44} className="text-primary" />
        </div>
      ),
      title: t("welcome.s2.title"),
      body: t("welcome.s2.body"),
    },
    {
      art: <Logo variant="icon" size={88} />,
      title: t("welcome.s3.title"),
      body: t("welcome.s3.body"),
    },
    {
      art: (
        <div className="w-24 h-24 rounded-3xl bg-secondary-soft grid place-items-center">
          <BookOpenText size={44} className="text-secondary" />
        </div>
      ),
      title: t("welcome.s4.title"),
      body: t("welcome.s4.body"),
    },
    {
      art: (
        <div className="w-24 h-24 rounded-3xl bg-primary-soft grid place-items-center">
          <UserRound size={44} className="text-primary" />
        </div>
      ),
      title: t("welcome.s5.title"),
      body: t("welcome.s5.body"),
    },
  ];
  const last = step === slides.length - 1;
  const s = slides[step];

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col">
      {/* Top bar: language + skip */}
      <div className="flex items-center justify-between p-4 pt-5">
        <LanguageToggle />
        <button
          onClick={() => finish()}
          className="text-sm text-muted hover:text-foreground px-3 py-1.5"
        >
          {t("welcome.skip")}
        </button>
      </div>

      {/* Slide */}
      <div
        className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-5 animate-rise"
        key={step}
      >
        {s.art}
        {/* The signature verse — the heart of the app — on the opening slide */}
        {step === 0 && ayah.arabic && (
          <>
            <p
              className="font-quran text-lg md:text-xl text-muted leading-[2.1] max-w-md"
              dir="rtl"
            >
              {cleanAyah(ayah.arabic)}
            </p>
            {lang === "en" && ayah.translation && (
              <p className="text-xs text-muted/80 italic max-w-sm -mt-2" dir="ltr">
                “{ayah.translation}”
              </p>
            )}
          </>
        )}
        <h1 className="text-[1.8rem] md:text-4xl font-bold text-primary leading-snug max-w-md">
          {s.title}
        </h1>
        <p className="text-[15px] md:text-base text-muted leading-relaxed max-w-sm">
          {s.body}
        </p>
      </div>

      {/* Dots + action */}
      <div className="p-6 pb-10 flex flex-col items-center gap-6">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-primary" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => (last ? finish(true) : setStep(step + 1))}
          className={`${last ? "btn-cta" : "btn-primary"} w-full max-w-sm py-4 text-lg`}
        >
          {last ? t("welcome.startSetup") : t("welcome.next")}
        </button>
      </div>
    </div>
  );
}

// Language picker — the very first thing anyone sees. Deliberately NOT
// translated via t(): the reader hasn't chosen a language yet, so both
// labels are shown in their own true script so either reader recognizes
// theirs immediately.
function LangStep({ onPick }: { onPick: (l: Lang) => void }) {
  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col items-center justify-center gap-8 px-8 text-center animate-rise">
      <Logo variant="icon" size={64} />
      <div className="space-y-1.5">
        <p className="text-2xl font-bold text-primary" dir="rtl">
          اختر لغتك
        </p>
        <p className="text-2xl font-bold text-primary" dir="ltr">
          Choose your language
        </p>
      </div>
      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={() => onPick("ar")}
          dir="rtl"
          className="btn-primary w-full py-4 text-xl font-bold"
        >
          العربية
        </button>
        <button
          onClick={() => onPick("en")}
          dir="ltr"
          className="btn-primary w-full py-4 text-xl font-bold"
        >
          English
        </button>
      </div>
    </div>
  );
}

// Appearance picker — dark is pre-selected (the app's default look); tapping
// any option applies it immediately so the screen itself previews the choice.
function ThemeStep({
  t,
  onContinue,
}: {
  t: (key: string) => string;
  onContinue: () => void;
}) {
  const [choice, setChoice] = useState<ThemePref>("dark");
  const OPTIONS: ThemePref[] = ["dark", "light", "system"];

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col items-center justify-center gap-6 px-8 text-center animate-rise">
      <Logo variant="icon" size={56} />
      <h1 className="text-2xl font-bold text-primary">{t("theme.title")}</h1>
      <div className="w-full max-w-sm space-y-3">
        {OPTIONS.map((opt) => {
          const on = choice === opt;
          return (
            <button
              key={opt}
              onClick={() => {
                setChoice(opt);
                applyTheme(opt);
              }}
              aria-pressed={on}
              className={`w-full flex items-center justify-between rounded-2xl border-2 px-5 py-4 text-lg font-bold transition ${
                on
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border text-foreground"
              }`}
            >
              {t(`theme.${opt}`)}
              {on && <Check size={20} />}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted">{t("theme.hint")}</p>
      <button
        onClick={onContinue}
        className="btn-cta w-full max-w-sm py-4 text-lg"
      >
        {t("common.continue")}
      </button>
    </div>
  );
}
