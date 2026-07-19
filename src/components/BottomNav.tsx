"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpenText, BarChart3, Settings } from "lucide-react";
import { useLang } from "@/components/LanguageProvider";

export const TABS = [
  { href: "/home", key: "nav.home", Icon: Home },
  { href: "/setup", key: "nav.setup", Icon: BookOpenText },
  { href: "/history", key: "nav.history", Icon: BarChart3 },
  { href: "/settings", key: "nav.settings", Icon: Settings },
];

// Mobile: fixed bottom tab bar (hidden on desktop).
export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLang();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 pb-safe md:hidden">
      <div className="mx-auto max-w-md px-3">
        <div className="card flex items-stretch justify-around px-1.5 py-1.5">
          {TABS.map(({ href, key, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex-1 flex flex-col items-center gap-0.5 rounded-lg py-2 transition-colors ${
                  active ? "text-primary" : "text-muted hover:text-foreground"
                }`}
              >
                <span
                  className={`grid place-items-center rounded-lg px-4 py-1 transition-colors ${
                    active ? "bg-primary-soft" : ""
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className="text-[11px] font-medium">{t(key)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

// Desktop: inline horizontal tabs inside the header (hidden on mobile).
export function TopNav() {
  const pathname = usePathname();
  const { t } = useLang();
  return (
    <nav className="hidden md:flex items-center gap-1">
      {TABS.map(({ href, key, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-primary-soft text-primary"
                : "text-muted hover:text-foreground hover:bg-surface-2"
            }`}
          >
            <Icon size={17} strokeWidth={active ? 2.4 : 2} />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
