import type { MetadataRoute } from "next";

// Web app manifest — lets the app be added to a phone home screen and launch
// full-screen (standalone) with brand theming.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "أقِم الصلاة — Aqim Al-Salah",
    short_name: "أقِم",
    description:
      "اقرأ بخشوع، لا بعادة — آية مختلفة من محفوظاتك لكل صلاة، لتراجع حفظك وتتدبر أكثر.",
    // Installed app opens straight into the app (WhatsApp-style): first launch
    // shows the one-time Welcome onboarding, later launches go to the dashboard.
    // The marketing landing page at "/" is for browser visitors.
    start_url: "/home",
    // True fullscreen: the system status bar is hidden everywhere with NO
    // "exit full screen" toast (that toast only comes from the JS
    // Fullscreen API). The reader's tap-chrome carries its own clock.
    display: "fullscreen",
    display_override: ["fullscreen", "standalone"],
    background_color: "#f3eee3",
    // Status bar matches the app background so it blends in (the reading
    // page especially) instead of sitting as a dark brand-colored band.
    theme_color: "#f3eee3",
    dir: "rtl",
    lang: "ar",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
    // Long-press the app icon → jump straight to a section (OS shortcuts).
    shortcuts: [
      {
        name: "أقِم — اقتراح الصلاة",
        url: "/home",
        icons: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
      },
      {
        name: "القرآن",
        url: "/quran",
        icons: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
      },
      {
        name: "المسبحة",
        url: "/tasbih",
        icons: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
      },
      {
        name: "الأذكار",
        url: "/adhkar",
        icons: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
      },
    ],
  };
}
