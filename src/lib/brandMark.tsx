// The sujood mark — rendered as NATIVE inline SVG elements (not a data-URI
// <img>). ImageResponse/Satori renders <svg>/<path>/<line>/<circle> directly;
// going through a data:image/svg+xml URI string was silently producing a
// blank (background-only) PNG in every icon route, including apple-icon,
// which is why the home-screen icon disappeared. Never reintroduce the
// data-URI approach for icons generated this way.
export function SujoodMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        fill="none"
        stroke="#F3EEE3"
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1={18} y1={46} x2={46} y2={46} />
        <path d="M45 21 Q33 24 23 44" />
      </g>
      <circle cx={22.5} cy={42} r={5} fill="#B99257" />
    </svg>
  );
}
