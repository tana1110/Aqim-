import { ImageResponse } from "next/og";
import { SujoodMark } from "@/lib/brandMark";

// 512x512 PNG icon — the primary Google Play Store listing icon and the
// manifest's largest "any" purpose icon.
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
        <SujoodMark size={512} />
      </div>
    ),
    { ...size },
  );
}
