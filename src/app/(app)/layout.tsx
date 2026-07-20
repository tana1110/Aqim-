"use client";

import Link from "next/link";
import { BottomNav, TopNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";
import { SplashScreen } from "@/components/SplashScreen";
import { Welcome } from "@/components/Welcome";
import { ReminderScheduler } from "@/components/ReminderScheduler";
import { LanguageToggle } from "@/components/LanguageToggle";

// Responsive app shell: mobile bottom tab bar, desktop top nav; content widens
// on larger screens.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col">
      <SplashScreen />
      <Welcome />
      <ReminderScheduler />
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="mx-auto max-w-6xl px-4 md:px-8 py-3 flex items-center justify-between gap-4">
          <Link href="/home" className="flex items-center gap-2.5 shrink-0">
            <Logo variant={2} size={34} />
            <span className="text-[11px] tracking-widest text-muted mt-1">
              AQIM
            </span>
          </Link>

          <TopNav />

          <LanguageToggle />
        </div>
      </header>

      <main className="flex-1 w-full mx-auto max-w-6xl px-4 md:px-8 pb-28 md:pb-14 pt-2">
        {children}
      </main>

      <div className="h-nav md:hidden" aria-hidden />
      <BottomNav />
    </div>
  );
}
