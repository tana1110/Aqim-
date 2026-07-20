"use client";

import { useEffect, useState } from "react";
import { BrandOverlay } from "@/components/Brand";

// Boot splash — ONE brand moment per session (a fresh app launch). Never on
// refreshes or in-app navigation, and skipped when the first-run Welcome is
// due (the Welcome IS the brand moment then). Loading screens should be rare
// and meaningful, not constant.
export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
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
