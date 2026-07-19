import * as React from "react";

// One cohesive custom line-icon set for the prayer modes. Single-color (inherits
// currentColor → set to --color-primary by the caller), identical stroke width
// and size, matching the minimal geometric feel of the logo.

interface IconProps {
  size?: number;
  className?: string;
}

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// الفرائض — a minimal mosque silhouette (dome, finial, arched doorway).
export function MosqueIcon({ size = 26, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      {...base}
    >
      <path d="M3 21h18" />
      <path d="M5 21V12" />
      <path d="M19 21V12" />
      <path d="M5 12q7-8 14 0" />
      <path d="M12 4V2" />
      <path d="M9.5 21v-5.5q2.5-2.5 5 0V21" />
    </svg>
  );
}

// النوافل — a prayer mat (mihrab-arch) with a small "+" signalling extra/optional.
export function NafilahIcon({ size = 26, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      {...base}
    >
      <path d="M7 21V11q5-6 10 0v10Z" />
      <path d="M12 21v-6" />
      <path d="M20 3.5v4" />
      <path d="M18 5.5h4" />
    </svg>
  );
}

// قيام الليل — a crescent moon with a small star.
export function QiyamIcon({ size = 26, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      {...base}
    >
      <path d="M20 15.5A7.5 7.5 0 1 1 10.5 4a6 6 0 0 0 9.5 11.5Z" />
      <path d="M18.5 3.2l.7 1.7 1.8.2-1.3 1.2.4 1.8-1.6-.9-1.6.9.4-1.8-1.3-1.2 1.8-.2Z" />
    </svg>
  );
}
