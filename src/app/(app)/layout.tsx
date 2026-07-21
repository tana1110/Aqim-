"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { NavDrawer, TopNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";
import { SplashScreen } from "@/components/SplashScreen";
import { Welcome } from "@/components/Welcome";
import { ReminderScheduler } from "@/components/ReminderScheduler";

// App shell: header with hamburger → side drawer on mobile, inline tabs on
// desktop. No bottom bar.
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

          <TopNav />

          {/* Language switching lives in Settings only (by design). */}
          <span className="w-10" aria-hidden />
        </div>
      </header>

      <main className="flex-1 w-full mx-auto max-w-6xl px-4 md:px-8 pb-12 pt-2">
        {children}
      </main>
    </div>
  );
}
