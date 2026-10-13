"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useLang } from "@/components/LanguageProvider";
import { isNativeApp } from "@/lib/nativeBridge";

// Install card, phone browsers only (never inside the Android app):
// Android → the real app on Google Play; iPhone/iPad → add to Home Screen,
// which is also what lets iOS deliver reminders at all.

const DISMISS_KEY = "aqim-install-dismissed";
export const PLAY_URL = "https://play.google.com/store/apps/details?id=app.aqimalsalat";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIosLike(): boolean {
  const ua = navigator.userAgent;
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS 13+ masquerades as a Mac but has touch
    (/Mac/.test(ua) && navigator.maxTouchPoints > 1)
  );
}

type Kind = "android" | "ios" | null;

// Which install card this device should see right now (null = none). The
// reminders card uses this too, so the two never stack.
export function installCardKind(): Kind {
  try {
    if (isNativeApp() || isStandalone() || localStorage.getItem(DISMISS_KEY)) return null;
    if (!window.matchMedia("(pointer: coarse)").matches) return null;
    if (isIosLike()) return "ios";
    if (/android/i.test(navigator.userAgent)) return "android";
  } catch {}
  return null;
}

export function InstallPrompt() {
  const { t } = useLang();
  const [kind, setKind] = useState<Kind>(null);

  useEffect(() => {
    setKind(installCardKind());
  }, []);

  function dismiss() {
    setKind(null);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    window.dispatchEvent(new Event("aqim-install-dismissed"));
  }

  if (!kind) return null;

  return (
    <section className="card p-4 flex items-start gap-3 animate-rise">
      <span className="w-10 h-10 rounded-2xl bg-surface-2 grid place-items-center shrink-0">
        <Logo variant="icon" size={24} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-extrabold">
          {kind === "ios" ? t("install.ios.title") : t("install.title")}
        </div>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">
          {kind === "ios" ? t("install.ios.steps") : t("install.body")}
        </p>
        <div className="flex items-center gap-2 mt-2.5">
          {kind === "android" && (
            <a
              href={PLAY_URL}
              target="_blank"
              rel="noopener"
              className="btn-cta !rounded-full px-4 py-2 text-xs flex items-center gap-1.5"
            >
              <Download size={13} />
              {t("install.play")}
            </a>
          )}
          <button
            onClick={dismiss}
            className="px-3 py-2 text-xs text-muted hover:text-foreground"
          >
            {t("install.later")}
          </button>
        </div>
      </div>
    </section>
  );
}
