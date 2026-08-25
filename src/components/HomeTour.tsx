"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/components/LanguageProvider";

// First-run guided tour: a soft spotlight walks the new user through the
// real screen, step by step. Skippable at any moment; shown once.

const DONE_KEY = "aqim-tour-done";
const ONBOARD_KEY = "aqim-onboarded";

const STEPS: { sel: string; k: string; fixed?: boolean }[] = [
  { sel: '[data-tour="aqim"]', k: "1" },
  { sel: '[data-tour="tasks"]', k: "2" },
  { sel: '[data-tour="misbaha"]', k: "3" },
  { sel: '[data-tour="continue"]', k: "4" },
  { sel: '[data-tour="nav"]', k: "5", fixed: true },
];

export function HomeTour() {
  const { t } = useLang();
  const [step, setStep] = useState(-1);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Start once: after onboarding, first time the home page is seen.
  useEffect(() => {
    const maybeStart = () => {
      try {
        if (
          localStorage.getItem(ONBOARD_KEY) &&
          !localStorage.getItem(DONE_KEY)
        ) {
          setTimeout(() => setStep((s) => (s === -1 ? 0 : s)), 900);
        }
      } catch {}
    };
    maybeStart();
    // If the Welcome overlay finishes while we're mounted, start then.
    window.addEventListener("aqim-onboarded", maybeStart);
    return () => window.removeEventListener("aqim-onboarded", maybeStart);
  }, []);

  // Find the first MATCH THAT IS ACTUALLY VISIBLE for a selector. Some
  // targets exist twice in the DOM (a mobile version and a desktop version
  // of the same nav, one hidden via CSS at any given width) — picking by
  // DOM order instead of visibility previously locked onto the hidden one,
  // whose zero-size rect sent the spotlight to a broken (0,0) position.
  function visibleMatch(sel: string): Element | null {
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return el;
    }
    return null;
  }

  // Position the spotlight on the current step's element.
  useEffect(() => {
    if (step < 0) return;
    if (step >= STEPS.length) {
      finish();
      return;
    }
    const s = STEPS[step];
    const el = visibleMatch(s.sel);
    if (!el) {
      setStep(step + 1);
      return;
    }
    setRect(null);
    if (s.fixed) window.scrollTo({ top: 0, behavior: "smooth" });
    else el.scrollIntoView({ block: "center", behavior: "smooth" });
    const id = setTimeout(() => {
      const r = el.getBoundingClientRect();
      // The layout may have shifted (resize, content still loading) during
      // the wait — re-check rather than trust the stale element reference.
      if (r.width > 0 && r.height > 0) setRect(r);
      else setStep(step + 1);
    }, 430);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function finish() {
    try {
      localStorage.setItem(DONE_KEY, "1");
    } catch {}
    setStep(-1);
    setRect(null);
  }

  if (step < 0 || step >= STEPS.length || !rect) return null;
  // Belt-and-suspenders: never render a spotlight/tooltip from a degenerate
  // rect (e.g. a mid-transition resize) — it would clip against the screen
  // edge instead of framing anything real.
  if (rect.width <= 0 || rect.height <= 0) return null;

  const pad = 8;
  const last = step === STEPS.length - 1;
  const below = rect.top < window.innerHeight / 2;
  const k = STEPS[step].k;

  return (
    <div className="fixed inset-0 z-[60]" aria-modal>
      {/* spotlight hole — everything else dims */}
      <div
        className="absolute rounded-3xl transition-all duration-300 pointer-events-none"
        style={{
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          boxShadow: "0 0 0 9999px rgba(20, 30, 38, 0.62)",
        }}
      />

      {/* tooltip card */}
      <div
        className="fixed inset-x-4 max-w-md mx-auto animate-rise"
        style={
          below
            ? {
                top: Math.max(
                  64,
                  Math.min(rect.bottom + pad + 12, window.innerHeight - 220),
                ),
              }
            : {
                bottom: Math.max(
                  12,
                  window.innerHeight - rect.top + pad + 12,
                ),
              }
        }
      >
        <div className="rounded-3xl bg-surface shadow-lg p-5 space-y-3">
          <div className="text-base font-extrabold text-primary">
            {t(`tour.${k}.title`)}
          </div>
          <p className="text-sm text-muted leading-relaxed">
            {t(`tour.${k}.body`)}
          </p>
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? "w-5 bg-accent" : "w-1.5 bg-border"
                  }`}
                />
              ))}
            </span>
            <span className="flex items-center gap-2">
              <button
                onClick={finish}
                className="px-3 py-2 text-xs text-muted hover:text-foreground"
              >
                {t("tour.skip")}
              </button>
              <button
                onClick={() => (last ? finish() : setStep(step + 1))}
                className="btn-cta !rounded-full px-6 py-2.5 text-sm"
              >
                {last ? t("tour.finish") : t("tour.next")}
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
