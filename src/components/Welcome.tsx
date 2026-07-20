"use client";

import { useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenText } from "lucide-react";
import { Logo } from "@/components/Logo";
import { BrandOverlay } from "@/components/Brand";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLang } from "@/components/LanguageProvider";
import { cleanAyah } from "@/lib/quranDisplay";

const FLAG = "aqim-onboarded";

// The app's welcome (first-run onboarding), shown ONCE per device — like a
// native app's intro. Ends at the memorization picker. Later opens go straight
// to the dashboard and never see this again.
export function Welcome() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
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
        // The signature verse (Al-Isra 17:78) for the opening slide.
        fetch("/api/slogan-ayah")
          .then((r) => r.json())
          .then(setAyah)
          .catch(() => {});
      } else {
        // Already onboarded — make sure the paint-blocking cover is down.
        document.documentElement.removeAttribute("data-welcome");
      }
    } catch {}
  }, []);

  if (!visible) return null;

  // Hand-off transition after finishing/skipping — same brand overlay as boot.
  if (leaving) return <BrandOverlay />;

  function finish(goSetup: boolean) {
    try {
      localStorage.setItem(FLAG, "1");
    } catch {}
    // Brief brand transition so the hand-off into the app feels intentional.
    setLeaving(true);
    setTimeout(() => {
      document.documentElement.removeAttribute("data-welcome");
      setVisible(false);
      if (goSetup) router.push("/setup");
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
  ];
  const last = step === slides.length - 1;
  const s = slides[step];

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col">
      {/* Top bar: language + skip */}
      <div className="flex items-center justify-between p-4 pt-5">
        <LanguageToggle />
        <button
          onClick={() => finish(false)}
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
        <h1 className="font-heading text-[1.9rem] md:text-4xl font-bold text-primary leading-snug max-w-md">
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
          {last ? t("welcome.start") : t("welcome.next")}
        </button>
      </div>
    </div>
  );
}
