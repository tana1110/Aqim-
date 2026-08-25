import { ImageResponse } from "next/og";
import { SujoodMark } from "@/lib/brandMark";

// iOS home-screen icon (PNG). Generated from code so we don't ship a binary.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        <SujoodMark size={180} />
      </div>
    ),
    { ...size },
  );
}
