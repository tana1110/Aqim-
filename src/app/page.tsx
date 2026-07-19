import { redirect } from "next/navigation";

// The landing page has been retired: everyone goes straight into the app.
// First-time visitors get the one-time Welcome onboarding there.
export default function Root() {
  redirect("/home");
}
