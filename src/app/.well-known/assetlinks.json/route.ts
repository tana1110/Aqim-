import { NextResponse } from "next/server";

// Digital Asset Links — proves this website and the Android app (built via
// PWABuilder/Bubblewrap as a Trusted Web Activity) are owned by the same
// party, so Android opens the app full-screen with no address bar.
//
// These values are public by design (this file is meant to be fetched by
// Android itself) — not secrets, so no need to route them through env vars.
// Fingerprint is the Play Console "App signing key certificate" SHA-256.
const packageName = "app.aqimalsalat";
const fingerprint =
  "63:51:54:06:17:CF:73:53:8E:2C:0E:88:DA:82:10:25:54:56:3E:04:0A:35:B0:F9:59:38:2C:9F:DA:02:2C:C7";

export async function GET() {
  return NextResponse.json([
    {
      relation: [
        "delegate_permission/common.handle_all_urls",
        "delegate_permission/common.get_login_creds",
      ],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: [fingerprint],
      },
    },
  ]);
}
