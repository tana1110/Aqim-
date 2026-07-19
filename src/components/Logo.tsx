import * as React from "react";

/**
 * Aqim wordmark — the Arabic word "أقم" ("establish [the prayer]"), subtly
 * reshaped to evoke a figure in sujood (prostration): a forward bow, an arched
 * "back" stroke, and an accent "head" dot near the ground. The letterforms are
 * real font glyphs (so the word always reads clearly); the sujood is suggested,
 * never literally drawn.
 *
 * Variants run from 1 (barely bent, most legible) to 4 (most stylised), plus an
 * abstract "icon" mark for favicon / app-icon scale.
 *
 * Colors are theme tokens only, applied via inline `style` (CSS custom
 * properties resolve reliably there; as SVG presentation attributes they do
 * not, across browsers).
 */
export type LogoVariant = 1 | 2 | 3 | 4 | "icon";

// Fill/stroke via style so var() resolves everywhere.
const fillPrimary = { fill: "var(--color-primary)" } as const;
const fillAccent = { fill: "var(--color-accent)" } as const;
const strokePrimary = { stroke: "var(--color-primary)", fill: "none" } as const;
const CAIRO = "var(--font-cairo), sans-serif";
const AMIRI = "var(--font-amiri), serif";

interface LogoProps {
  size?: number; // rendered height in px
  variant?: LogoVariant;
  className?: string;
}

// The word, centered, with a chosen font / size / weight.
function Word({
  font,
  size,
  weight = 700,
  y = 100,
}: {
  font: string;
  size: number;
  weight?: number;
  y?: number;
}) {
  return (
    <text
      x="120"
      y={y}
      textAnchor="middle"
      fontSize={size}
      style={{
        ...fillPrimary,
        fontFamily: font,
        fontWeight: weight,
        direction: "rtl",
      }}
    >
      أقم
    </text>
  );
}

export function Logo({ size = 48, variant = 2, className }: LogoProps) {
  if (variant === "icon") {
    // Abstract sujood mark for small sizes (favicon / app icon).
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        role="img"
        aria-label="أقم"
        className={className}
      >
        <title>أقم</title>
        {/* ground / prayer line */}
        <line
          x1="14"
          y1="50"
          x2="50"
          y2="50"
          strokeWidth="4"
          strokeLinecap="round"
          style={strokePrimary}
        />
        {/* arched back + head bowing toward the ground */}
        <path
          d="M47 23 Q33 25 21 47"
          strokeWidth="7"
          strokeLinecap="round"
          style={strokePrimary}
        />
        {/* head */}
        <circle cx="20" cy="45" r="5" style={fillAccent} />
      </svg>
    );
  }

  const width = Math.round(size * 1.6);
  const common = {
    width,
    height: size,
    viewBox: "0 0 240 150",
    role: "img" as const,
    "aria-label": "أقم",
    className,
  };

  switch (variant) {
    // 1 — barely bent, most legible. A calm accent dot crowns the alef.
    case 1:
      return (
        <svg {...common}>
          <title>أقم</title>
          <g transform="rotate(-2 120 92)">
            <Word font={CAIRO} size={84} />
          </g>
          <circle cx="176" cy="50" r="5" style={fillAccent} />
        </svg>
      );

    // 2 — a gentle forward bow; the word leans as if beginning to prostrate.
    case 2:
      return (
        <svg {...common}>
          <title>أقم</title>
          <g transform="rotate(-8 120 104)">
            <Word font={CAIRO} size={82} />
          </g>
          <circle cx="150" cy="120" r="5.5" style={fillAccent} />
        </svg>
      );

    // 3 — clearer bow: classical Amiri letters over an arched "back" stroke.
    case 3:
      return (
        <svg {...common}>
          <title>أقم</title>
          <path
            d="M58 120 Q120 98 188 118"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.55"
            style={strokePrimary}
          />
          <g transform="rotate(-9 120 96)">
            <Word font={AMIRI} size={80} y={92} />
          </g>
          <circle cx="60" cy="122" r="6" style={fillAccent} />
        </svg>
      );

    // 4 — most stylised: arced posture, grounded, head to the floor.
    case 4:
    default:
      return (
        <svg {...common}>
          <title>أقم</title>
          <line
            x1="44"
            y1="132"
            x2="196"
            y2="132"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.4"
            style={strokePrimary}
          />
          <path
            d="M190 120 Q126 86 62 126"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.6"
            style={strokePrimary}
          />
          <g transform="rotate(-11 118 92) skewX(-4)">
            <Word font={AMIRI} size={74} y={88} />
          </g>
          <circle cx="62" cy="126" r="6.5" style={fillAccent} />
        </svg>
      );
  }
}
