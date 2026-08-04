"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLang } from "@/components/LanguageProvider";

// Android-standard back behavior at the app root: the first back press shows
// "press again to exit" and stays; a second press within 2s really leaves.
// Elsewhere, back moves through in-app history normally (client routing).
export function BackExitGuard() {
  const pathname = usePathname();
  const { t } = useLang();
  const [toast, setToast] = useState(false);
  const armedAt = useRef(0);

  useEffect(() => {
    if (pathname !== "/home") return;
    // A guard entry sits on top of the history stack while we're at home.
    window.history.pushState({ aqimGuard: true }, "");
    const onPop = () => {
      const now = Date.now();
      if (now - armedAt.current < 2000) {
        // deliberate double-press: let the browser continue leaving
        window.history.back();
        return;
      }
      armedAt.current = now;
      setToast(true);
      setTimeout(() => setToast(false), 2000);
      window.history.pushState({ aqimGuard: true }, "");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [pathname]);

  if (!toast) return null;
  return (
    <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center pointer-events-none">
      <span className="rounded-full bg-primary text-white px-5 py-2.5 text-sm font-bold shadow-lg animate-rise">
        {t("app.backToExit")}
      </span>
    </div>
  );
}
