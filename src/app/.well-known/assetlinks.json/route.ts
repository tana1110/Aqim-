import { NextResponse } from "next/server";

// Digital Asset Links — proves this website and the Android app (built via
// PWABuilder/Bubblewrap as a Trusted Web Activity) are owned by the same
// party, so Android opens the app full-screen with no address bar.
//
// These values are public by design (this file is meant to be fetched by
// Android itself) — not secrets, so no need to route them through env vars.
//
// TWO fingerprints, on purpose: Play App Signing re-signs the app with its
// OWN certificate for anything actually distributed to users (production,
// and any track once Play App Signing is enrolled) — separate from the
// local upload-key certificate used for early manual test uploads. Both
// need to verify, or whichever track doesn't match falls back to the
// browser-chrome Custom Tab instead of true full-screen.
const packageName = "app.aqimalsalat";
const fingerprints = [
  // Local upload key (signing.keystore) — internal/closed testing builds
  // uploaded directly via PWABuilder.
  "63:51:54:06:17:CF:73:53:8E:2C:0E:88:DA:82:10:25:54:56:3E:04:0A:35:B0:F9:59:38:2C:9F:DA:02:2C:C7",
  // Play App Signing's deployment certificate — what actually signs the
  // app users install from the Play Store (Setup > App integrity >
  // App signing > Classical key > "deployment_cert").
  "07:AF:93:1B:8B:CE:B0:35:AF:15:B9:9F:D1:DA:19:99:FE:A8:C3:E8:4D:C2:2E:46:9D:CE:61:57:3F:69:CE:3E",
];

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
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ]);
}
