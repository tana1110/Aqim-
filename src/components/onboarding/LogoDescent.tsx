// The real logo mark (same geometry as <Logo variant="icon">), animated as a
// descent into sujood: the ground draws in, then the dot travels DOWN the
// arc to rest at the ground while the arc is revealed behind it, ending in
// one soft landing. No rotation, no other poses.
export function LogoDescent({
  className = "",
  fast = false,
}: {
  className?: string;
  fast?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="أقِم"
      className={`onb-logo ${fast ? "onb-logo-fast" : ""} ${className}`}
    >
      <line
        className="onb-l-ground"
        x1="14"
        y1="50"
        x2="50"
        y2="50"
        stroke="var(--color-primary)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        className="onb-l-arc"
        d="M47 23 Q33 25 21 47"
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <g className="onb-l-dot">
        <circle className="onb-l-land" r="5" fill="var(--color-accent)" />
      </g>
    </svg>
  );
}
