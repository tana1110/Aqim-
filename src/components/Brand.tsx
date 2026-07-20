"use client";

import { Logo, LogoLoader } from "@/components/Logo";

// THE one brand-loading system. Every branded loading surface in the app uses
// exactly these three pieces so sizes, spacing, and motion always match:
//   <BrandMark/>     — sujood loader + أقِم wordmark (pop + rise)
//   <BrandOverlay/>  — full-screen version (boot, transitions)
//   <PageLoader/>    — in-content version for loading screens
export function BrandMark({ size = 104 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="animate-splash-pop text-primary">
        <LogoLoader size={size} />
      </div>
      <span className="font-heading text-4xl text-primary animate-splash-rise">
        أقِم
      </span>
    </div>
  );
}

export function BrandOverlay({
  fading = false,
  className,
}: {
  fading?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-50 grid place-items-center bg-background transition-opacity duration-450 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      } ${className ?? ""}`}
    >
      <BrandMark />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="grid place-items-center py-24 text-primary">
      <LogoLoader size={64} />
    </div>
  );
}

export { Logo, LogoLoader };
