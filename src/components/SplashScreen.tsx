"use client";

import { useLayoutEffect, useState } from "react";
import { BrandOverlay } from "@/components/Brand";

// Boot splash — ONE brand moment per session (a fresh app launch). Never on
// refreshes or in-app navigation, and skipped when the first-run Welcome is
// due (the Welcome IS the brand moment then). Loading screens should be rare
// and meaningful, not constant.
//
// useLayoutEffect, NOT useEffect: the skip decision (already onboarded +
// already booted this session, or never onboarded at all) has to land
// BEFORE the browser's first paint. useEffect runs after paint, so the
// overlay was flashing onscreen for a frame even on runs that should
// never show it at all — exactly the "flash on open" symptom reported.
export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useLayoutEffect(() => {
    try {
      if (
        !localStorage.getItem("aqim-onboarded") ||
        sessionStorage.getItem("aqim-booted")
      ) {
        setVisible(false);
        return;
      }
      sessionStorage.setItem("aqim-booted", "1");
    } catch {}
    const startFade = setTimeout(() => setFading(true), 900);
    const remove = setTimeout(() => setVisible(false), 1350);
    return () => {
      clearTimeout(startFade);
      clearTimeout(remove);
    };
  }, []);

  if (!visible) return null;
  return <BrandOverlay fading={fading} />;
}
