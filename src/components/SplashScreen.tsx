"use client";

import { useLayoutEffect, useState } from "react";
import { Logo } from "@/components/Logo";

const SESSION_KEY = "aqim-splashed";

// Brand splash shown when entering the app — at most ONCE per browser session,
// and NOT when launched as an installed app (standalone), since the OS already
// shows its own launch splash there; stacking a second one felt messy.
export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useLayoutEffect(() => {
    try {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        // iOS Safari legacy flag
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (standalone || sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // storage unavailable — show it this once
    }
    setVisible(true);
    const startFade = setTimeout(() => setFading(true), 1400);
    const remove = setTimeout(() => setVisible(false), 1900);
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
