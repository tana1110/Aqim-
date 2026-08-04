"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { BottomTabs, NavDrawer, SideNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";
import { SplashScreen } from "@/components/SplashScreen";
import { Welcome } from "@/components/Welcome";
import { ReminderScheduler } from "@/components/ReminderScheduler";
import { SyncClient } from "@/components/SyncClient";
import { BackExitGuard } from "@/components/BackExitGuard";

// App shell: bottom tab bar + hamburger drawer on mobile, inline header
// tabs on desktop.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();
  // Home carries its own greeting header on phones; the Quran page is a
  // full-bleed reading surface — neither wants the brand bar on mobile.
  const isHome = pathname === "/home" || pathname === "/quran";

  // Pages without the app header (home on mobile) can still open the drawer.
  useEffect(() => {
    const open = () => setNavOpen(true);
    window.addEventListener("aqim-open-nav", open);
    return () => window.removeEventListener("aqim-open-nav", open);
  }, []);

  // Chrome fires beforeinstallprompt ONCE, early — capture it at the shell
  // level so the install card can use it whenever it mounts.
  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      (window as unknown as { __aqimBip?: Event }).__aqimBip = e;
      window.dispatchEvent(new Event("aqim-bip"));
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  return (
    <div className="min-h-dvh flex flex-col">
      <SplashScreen />
      <Welcome />
      <ReminderScheduler />
      <SyncClient />
      <BackExitGuard />
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} />

      <header
        className={`sticky top-0 z-20 bg-background border-b border-border ${
          isHome ? "hidden md:block" : ""
        }`}
      >
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
