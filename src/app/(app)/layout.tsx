"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { BottomTabs, NavDrawer, SideNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";
import { SplashScreen } from "@/components/SplashScreen";
import { Welcome } from "@/components/Welcome";
import { ReminderScheduler } from "@/components/ReminderScheduler";

// App shell: bottom tab bar + hamburger drawer on mobile, inline header
// tabs on desktop.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-dvh flex flex-col">
      <SplashScreen />
      <Welcome />
      <ReminderScheduler />
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} />

      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="mx-auto max-w-6xl px-3 md:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setNavOpen(true)}
              aria-label="menu"
              className="md:hidden w-10 h-10 grid place-items-center rounded-lg text-foreground hover:bg-surface-2 active:scale-95 transition"
            >
              <Menu size={22} />
            </button>
            <Link href="/home" className="flex items-center gap-2.5 shrink-0">
              <Logo variant={2} size={34} />
              <span className="hidden sm:inline text-[11px] tracking-widest text-muted mt-1">
                AQIM
              </span>
            </Link>
          </div>

          {/* Language switching lives in Settings only (user's preference). */}
          <span className="w-10" aria-hidden />
        </div>
      </header>

      {/* Desktop: side navigation (all sections); mobile: floating pill nav */}
      <main className="flex-1 w-full mx-auto max-w-6xl px-4 md:px-8 pb-28 md:pb-12 pt-2 md:flex md:gap-8 md:items-start">
        <SideNav />
        <div className="flex-1 min-w-0">{children}</div>
      </main>

      <BottomTabs />
    </div>
  );
}
