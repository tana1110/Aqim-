import type { MetadataRoute } from "next";

// Web app manifest — lets the app be added to a phone home screen and launch
// full-screen (standalone) with brand theming.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "أقم — Aqim",
    short_name: "أقم",
    description:
      "اقرأ بخشوع، لا بعادة — آية مختلفة من محفوظاتك لكل صلاة، لتراجع حفظك وتتدبر أكثر.",
    // Installed app opens straight into the app (WhatsApp-style): first launch
    // shows the one-time Welcome onboarding, later launches go to the dashboard.
    // The marketing landing page at "/" is for browser visitors.
    start_url: "/home",
    display: "standalone",
    background_color: "#1e2b34",
    theme_color: "#1e2b34",
    dir: "rtl",
    lang: "ar",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
