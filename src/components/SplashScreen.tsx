"use client";

import { useEffect, useState } from "react";
import { LogoLoader } from "@/components/Logo";

// Brand boot splash — shows on EVERY open/refresh of the app so each load
// "feels" like Aqim starting, but stays quick (~1s + fade) so it never gets
// in the way. The head-dot performs sujood while it's up.
export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const startFade = setTimeout(() => setFading(true), 950);
    const remove = setTimeout(() => setVisible(false), 1400);
    return () => {
      clearTimeout(startFade);
      clearTimeout(remove);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-50 grid place-items-center bg-background transition-opacity duration-450 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="animate-splash-pop text-primary">
          <LogoLoader size={104} />
        </div>
        <span className="font-heading text-4xl text-primary animate-splash-rise">
          أقِم
        </span>
      </div>
    </div>
  );
}
