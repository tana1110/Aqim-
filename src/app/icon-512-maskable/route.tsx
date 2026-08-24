import { ImageResponse } from "next/og";

// 512x512 MASKABLE icon: Android's adaptive-icon system crops this into a
// circle, squircle, or rounded square depending on the device launcher, so
// the mark is scaled down and centered inside the safe zone (the inner ~80%)
// with full-bleed background color reaching every edge (no transparency).
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

const mark = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
  <g fill='none' stroke='%23F3EEE3' stroke-width='4.5' stroke-linecap='round' stroke-linejoin='round'>
    <line x1='18' y1='46' x2='46' y2='46'/>
    <path d='M45 21 Q33 24 23 44'/>
  </g>
  <circle cx='22.5' cy='42' r='5' fill='%23B99257'/>
</svg>`;

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#33546A",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={330}
          height={330}
          src={`data:image/svg+xml;utf8,${mark}`}
          alt="أقم"
        />
      </div>
    ),
    { ...size },
  );
}
