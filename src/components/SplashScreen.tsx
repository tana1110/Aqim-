"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";

// A ~2s loading/splash screen shown when the app first opens. The logo animates
// in, holds briefly, then the whole screen fades out to reveal the app. It only
// mounts with the (app) shell, so it appears on entering the app — not when
// moving between the in-app tabs.
export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const startFade = setTimeout(() => setFading(true), 1600);
    const remove = setTimeout(() => setVisible(false), 2100);
    return () => {
      clearTimeout(startFade);
      clearTimeout(remove);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-50 grid place-items-center bg-background transition-opacity duration-500 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="animate-splash-pop">
          <Logo variant="icon" size={112} />
        </div>
        <span className="font-heading text-4xl text-primary animate-splash-rise">
          أقِم
        </span>
      </div>
    </div>
  );
}
