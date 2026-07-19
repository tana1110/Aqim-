import { ImageResponse } from "next/og";

// iOS home-screen icon (PNG). Generated from code so we don't ship a binary.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The sujood mark on a tile-blue tile, as an inline SVG data URI (rasterized).
const mark = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
  <rect width='64' height='64' fill='%2333546A'/>
  <g fill='none' stroke='%23F3EEE3' stroke-width='4.5' stroke-linecap='round' stroke-linejoin='round'>
    <line x1='18' y1='46' x2='46' y2='46'/>
    <path d='M45 21 Q33 24 23 44'/>
  </g>
  <circle cx='22.5' cy='42' r='5' fill='%23B99257'/>
</svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#33546A",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={180}
          height={180}
          src={`data:image/svg+xml;utf8,${mark}`}
          alt="أقم"
        />
      </div>
    ),
    { ...size },
  );
}
