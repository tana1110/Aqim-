"use client";

// Memorization growth over time — single-series line chart.
// Built to the dataviz method: line form for change-over-time, one validated
// hue (--chart-line, chroma+contrast checked light & dark), thin 2px line,
// ≥8px markers with native tooltips, recessive grid, text in text tokens,
// direct label on the latest value only, no legend (single series).
export interface GrowthPoint {
  at: string; // ISO
  total: number;
}

export function GrowthChart({
  points,
  ariaLabel,
}: {
  points: GrowthPoint[];
  ariaLabel: string;
}) {
  if (points.length === 0) return null;

  const W = 320;
  const H = 120;
  const PAD = { t: 14, r: 34, b: 18, l: 8 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const max = Math.max(...points.map((p) => p.total), 1);
  const xs = (i: number) =>
    PAD.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const ys = (v: number) => PAD.t + innerH - (v / max) * innerH;

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)},${ys(p.total).toFixed(1)}`)
    .join(" ");

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label={ariaLabel}
      style={{ direction: "ltr" }}
    >
      {/* recessive grid: 3 horizontal lines */}
      {[0.0, 0.5, 1.0].map((f) => (
        <line
          key={f}
          x1={PAD.l}
          x2={PAD.l + innerW}
          y1={PAD.t + innerH * f}
          y2={PAD.t + innerH * f}
          stroke="var(--color-border)"
          strokeWidth="1"
        />
      ))}
      {/* y max label + x range labels — text tokens, never series color */}
      <text x={PAD.l + innerW + 4} y={PAD.t + 4} fontSize="9" fill="var(--color-muted)">
        {max}
      </text>
      <text x={PAD.l} y={H - 5} fontSize="9" fill="var(--color-muted)">
        {fmtDate(points[0].at)}
      </text>
      <text x={PAD.l + innerW} y={H - 5} fontSize="9" fill="var(--color-muted)" textAnchor="end">
        {fmtDate(last.at)}
      </text>

      {/* the series */}
      <path d={path} fill="none" stroke="var(--chart-line)" strokeWidth="2" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={xs(i)}
          cy={ys(p.total)}
          r="4"
          fill="var(--chart-line)"
          stroke="var(--color-surface)"
          strokeWidth="2"
        >
          <title>{`${fmtDate(p.at)} — ${p.total}`}</title>
        </circle>
      ))}

      {/* direct label on the latest value only */}
      <text
        x={xs(points.length - 1)}
        y={ys(last.total) - 8}
        fontSize="10"
        fontWeight="700"
        fill="var(--color-foreground)"
        textAnchor="end"
      >
        {last.total}
      </text>
    </svg>
  );
}
