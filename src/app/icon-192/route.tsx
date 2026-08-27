import { ImageResponse } from "next/og";
import { SujoodMark } from "@/lib/brandMark";

// 192x192 PNG icon — for the web app manifest (Android home-screen icon).
export const size = { width: 192, height: 192 };
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
        <SujoodMark size={192} />
      </div>
    ),
    { ...size, headers: { "Access-Control-Allow-Origin": "*" } },
  );
}
