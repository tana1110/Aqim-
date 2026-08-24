import { NextResponse } from "next/server";

// Digital Asset Links — proves this website and the Android app (built via
// PWABuilder/Bubblewrap as a Trusted Web Activity) are owned by the same
// party, so Android opens the app full-screen with no address bar.
//
// PLACEHOLDER: fill `package_name` and `sha256_cert_fingerprints` once the
// Android package is generated (PWABuilder shows the fingerprint, or it's
// in Play Console → Setup → App integrity after the first upload).
export async function GET() {
  const packageName = process.env.ANDROID_PACKAGE_NAME;
  const fingerprint = process.env.ANDROID_SHA256_FINGERPRINT;

  if (!packageName || !fingerprint) {
    return NextResponse.json([]);
  }

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
