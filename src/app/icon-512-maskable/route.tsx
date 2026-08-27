import { ImageResponse } from "next/og";
import { SujoodMark } from "@/lib/brandMark";

// 512x512 MASKABLE icon: Android's adaptive-icon system crops this into a
// circle, squircle, or rounded square depending on the device launcher, so
// the mark is scaled down and centered inside the safe zone (the inner ~80%)
// with full-bleed background color reaching every edge (no transparency).
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

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
        <SujoodMark size={330} />
      </div>
    ),
    { ...size, headers: { "Access-Control-Allow-Origin": "*" } },
  );
}
