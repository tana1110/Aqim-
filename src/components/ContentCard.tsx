"use client";

import type { ReactNode } from "react";

// Polished "content card" — the designed highlight of a page. Used for
// آية اليوم today and reusable for future daily du'a / adhkar content:
// thin gold frame with corner accents, soft inner wash, centered hierarchy.
export function ContentCard({
  label,
  icon,
  reference,
  footer,
  children,
}: {
  label: string;
  icon?: ReactNode;
  reference?: ReactNode; // small muted line under the content
  footer?: ReactNode;
  children: ReactNode; // the featured content itself
}) {
  return (
    <section className="relative rounded-2xl border border-accent/45 bg-gradient-to-b from-accent-soft/70 to-surface p-6 text-center overflow-hidden animate-rise">
      {/* corner accents */}
      <CornerMark className="top-2 start-2" />
      <CornerMark className="top-2 end-2 -scale-x-100" />
      <CornerMark className="bottom-2 start-2 -scale-y-100" />
      <CornerMark className="bottom-2 end-2 -scale-100" />

      <div className="relative">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-accent mb-4">
          {icon}
          {label}
        </div>

        <div className="mx-auto max-w-xl">{children}</div>

        {reference && (
          <>
            <div className="mx-auto mt-4 mb-2 h-px w-16 bg-accent/40" />
            <div className="text-[11px] text-muted">{reference}</div>
          </>
        )}
        {footer}
      </div>
    </section>
  );
}

function CornerMark({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden
      className={`absolute text-accent/50 ${className ?? ""}`}
    >
      <path
        d="M1 9 Q1 1 9 1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
