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
    // The "#guard" is load-bearing, not decorative: the Android WebView
    // shell's canGoBack() silently returns false for a pushState entry
    // that shares the exact URL of the entry before it (confirmed via
    // copyBackForwardList() on-device — historySize was 2, currentIndex
    // was 1, canGoBack() still false), even though plain browser History
    // API back navigation works fine there. A distinct hash fragment is
    // enough to make WebView treat it as a real, navigable entry; it's
    // never sent to the server and Next's router ignores hash-only changes.
    const onPop = () => {
      const now = Date.now();
      if (now - armedAt.current < 2000) {
        // Deliberate second press: in the native app, end the Activity
        // directly — WebView history has nothing "before" this page to
        // fall back on, so leaving it to the browser would just strand the
        // user on a blank history state. Outside the app (a normal
        // browser/PWA tab), let it continue leaving as usual.
        if (window.AndroidApp?.exitApp) {
          window.AndroidApp.exitApp();
        } else {
          window.history.back();
        }
        return;
      }
      armedAt.current = now;
      setToast(true);
      setTimeout(() => setToast(false), 2000);
      window.history.pushState({ aqimGuard: true }, "", "#guard");
    };
    let armed = false;
    const arm = () => {
      if (armed) return;
      armed = true;
      window.history.pushState({ aqimGuard: true }, "", "#guard");
      window.addEventListener("popstate", onPop);
    };
    // First-launch onboarding owns the back button while it's on screen;
    // the guard arms once it's done.
    if (document.documentElement.hasAttribute("data-welcome")) {
      window.addEventListener("aqim-onboarded", arm);
    } else {
      arm();
    }
    return () => {
      window.removeEventListener("aqim-onboarded", arm);
      window.removeEventListener("popstate", onPop);
    };
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
