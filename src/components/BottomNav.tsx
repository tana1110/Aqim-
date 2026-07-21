"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpenText, BarChart3, Settings, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useLang } from "@/components/LanguageProvider";

export const TABS = [
  { href: "/home", key: "nav.home", Icon: Home },
  { href: "/setup", key: "nav.setup", Icon: BookOpenText },
  { href: "/history", key: "nav.history", Icon: BarChart3 },
  { href: "/settings", key: "nav.settings", Icon: Settings },
];

// Desktop: inline horizontal tabs inside the header.
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

// Mobile: hamburger-triggered side drawer (slides from the start side —
// right in RTL, left in LTR — with a dismissible backdrop).
export function NavDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { t } = useLang();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      {/* panel */}
      <div className="absolute inset-y-0 start-0 w-72 max-w-[82%] bg-surface border-e border-border shadow-lg flex flex-col animate-drawer">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="flex items-center gap-2">
            <Logo variant={2} size={30} />
            <span className="text-[10px] tracking-widest text-muted mt-1">
              AQIM
            </span>
          </span>
          <button
            onClick={onClose}
            aria-label="close"
            className="w-9 h-9 grid place-items-center rounded-lg text-muted hover:text-foreground hover:bg-surface-2"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {TABS.map(({ href, key, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-medium transition-colors ${
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-foreground hover:bg-surface-2"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                {t(key)}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
