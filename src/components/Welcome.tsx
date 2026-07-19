"use client";

import { useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenText, Repeat } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useLang } from "@/components/LanguageProvider";

const FLAG = "aqim-onboarded";

// First-run welcome (WhatsApp-style onboarding): shown ONCE per device, right
// after install / first visit to the app. Ends at the memorization picker.
// Subsequent opens go straight to the dashboard — this never appears again.
export function Welcome() {
  const { t } = useLang();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useLayoutEffect(() => {
    try {
      if (!localStorage.getItem(FLAG)) setVisible(true);
    } catch {}
  }, []);

  if (!visible) return null;

  function finish(goSetup: boolean) {
    try {
      localStorage.setItem(FLAG, "1");
    } catch {}
    setVisible(false);
    if (goSetup) router.push("/setup");
  }

  const slides = [
    {
      art: <Logo variant="icon" size={104} />,
      title: t("welcome.title"),
      body: t("welcome.intro"),
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
      art: (
        <div className="w-24 h-24 rounded-3xl bg-accent-soft grid place-items-center">
          <Repeat size={44} className="text-accent" />
        </div>
      ),
      title: t("welcome.s3.title"),
      body: t("welcome.s3.body"),
    },
  ];
  const last = step === slides.length - 1;
  const s = slides[step];

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col">
      {/* Skip */}
      <div className="flex justify-end p-4">
        <button
          onClick={() => finish(false)}
          className="text-sm text-muted hover:text-foreground px-3 py-1.5"
        >
          {t("welcome.skip")}
        </button>
      </div>

      {/* Slide */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-6 animate-rise" key={step}>
        {s.art}
        <h1 className="font-heading text-3xl font-bold text-foreground">
          {s.title}
        </h1>
        <p className="text-[15px] text-muted leading-relaxed max-w-sm">
          {s.body}
        </p>
      </div>

      {/* Dots + action */}
      <div className="p-6 pb-10 flex flex-col items-center gap-6">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
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
