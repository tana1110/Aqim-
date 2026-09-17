"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";

// Surfaces a tap-to-update banner the moment a new deploy's service worker
// takes over — so getting the latest version never requires clearing cache
// (not everyone knows how, and it isn't something a normal user should ever
// need to do). Reload is still user-triggered rather than automatic: doing
// it silently mid-session could wipe someone's half-finished setup screen
// or interrupt a tap they're mid-way through.
export function UpdateBanner() {
  const { t } = useLang();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let hadController = !!navigator.serviceWorker.controller;
    let reloading = false;

    const onControllerChange = () => {
      if (reloading) return;
      // The very first controller assignment (a fresh install) isn't an
      // update — only a CHANGE of an existing controller is.
      if (hadController) setReady(true);
      hadController = true;
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    // Browsers only check for a new service worker on navigation; a
    // long-lived session (this is a single-page app) might not navigate
    // again for a long time, so poll while the app is actually visible.
    let reg: ServiceWorkerRegistration | undefined;
    navigator.serviceWorker.getRegistration().then((r) => {
      reg = r;
    });
    const iv = setInterval(() => {
      if (document.visibilityState === "visible") reg?.update().catch(() => {});
    }, 60_000);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      clearInterval(iv);
    };
  }, []);

  if (!ready) return null;

  return (
    <div
      className="fixed inset-x-0 z-[60] px-4 flex justify-center animate-rise"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 92px)" }}
    >
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2.5 rounded-full bg-primary text-white pl-4 pr-3 py-2.5 text-sm font-bold shadow-lg active:scale-[0.97] transition"
      >
        {t("update.available")}
        <span className="flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-1 text-xs">
          <RefreshCw size={13} />
          {t("update.reload")}
        </span>
      </button>
    </div>
  );
}
