"use client";

import { useLang } from "@/components/LanguageProvider";
import type { Lang } from "@/lib/i18n";

const LABELS: Record<Lang, string> = { ar: "عربي", en: "EN" };

// Compact AR/EN segmented toggle.
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div
      className={`inline-flex items-center rounded-lg border border-border bg-surface p-0.5 text-xs font-bold ${className ?? ""}`}
    >
      {(["ar", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`px-2.5 py-1 rounded-md transition-colors ${
            lang === l
              ? "bg-primary text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
