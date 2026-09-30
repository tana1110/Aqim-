"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/components/LanguageProvider";

// Shown once, right after a brand-new signup (email or Google) — the
// account page stashes the first name in sessionStorage just before it
// navigates away (to /setup, /home, wherever `next` points), so this needs
// to live at the app-shell level to still be there to greet on arrival.
const KEY = "aqim-welcome-name";

export function announceWelcome(name: string) {
  try {
    sessionStorage.setItem(KEY, name);
  } catch {
    // sessionStorage can throw in rare private-browsing configurations —
    // worst case, no welcome toast, sign-in itself is unaffected.
  }
}

export function WelcomeToast() {
  const { t } = useLang();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(KEY);
      if (stored) sessionStorage.removeItem(KEY);
    } catch {
      // ignore
    }
    if (!stored) return;
    setName(stored);
    const timer = setTimeout(() => setName(null), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!name) return null;
  return (
    <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 pointer-events-none">
      <div className="max-w-sm rounded-2xl bg-primary text-white px-5 py-3.5 shadow-lg text-center animate-rise">
        <p className="font-bold text-sm">{t("account.welcome.title", { name })}</p>
        <p className="text-xs opacity-90 mt-0.5">{t("account.welcome.dua")}</p>
      </div>
    </div>
  );
}
