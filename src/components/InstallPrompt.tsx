"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useLang } from "@/components/LanguageProvider";

// Gentle install card: Chrome/Android get the real one-tap install prompt
// (the event is captured early by the app shell); iPhone/iPad get the
// add-to-home-screen steps. Phones only; never shown once installed or
// after being dismissed.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

const DISMISS_KEY = "aqim-install-dismissed";

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

export function InstallPrompt() {
  const { t } = useLang();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return;
      // Phones/tablets only — desktop install exists but the copy is mobile.
      if (!window.matchMedia("(pointer: coarse)").matches) return;
    } catch {
      return;
    }

    const adopt = () => {
      const bip = (window as unknown as { __aqimBip?: Event }).__aqimBip;
      if (bip) {
        setDeferred(bip as BeforeInstallPromptEvent);
        setHidden(false);
      }
    };
    adopt(); // the shell may have captured the event before we mounted
    window.addEventListener("aqim-bip", adopt);

    if (isIosLike()) setHidden(false); // manual add-to-home-screen steps

    const onInstalled = () => {
      setHidden(true);
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {}
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("aqim-bip", adopt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => null);
    // The deferred event is single-use either way — retire the card.
    dismiss();
    setDeferred(null);
  }

  if (hidden) return null;

  return (
    <section className="card p-4 flex items-start gap-3 animate-rise">
      <span className="w-10 h-10 rounded-2xl bg-surface-2 grid place-items-center shrink-0">
        <Logo variant="icon" size={24} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-extrabold">{t("install.title")}</div>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">
          {deferred ? t("install.body") : t("install.ios.steps")}
        </p>
        <div className="flex items-center gap-2 mt-2.5">
          {deferred && (
            <button
              onClick={install}
              className="btn-cta !rounded-full px-4 py-2 text-xs flex items-center gap-1.5"
            >
              <Download size={13} />
              {t("install.btn")}
            </button>
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
