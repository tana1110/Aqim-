"use client";

import { useEffect, useState } from "react";
import { BrandOverlay } from "@/components/Brand";

// Boot splash — a single quick brand moment on every open/refresh.
// Skipped when the first-run Welcome is due (the Welcome IS the brand moment
// then) so brand screens never stack back-to-back.
export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem("aqim-onboarded")) {
        setVisible(false);
        return;
      }
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
