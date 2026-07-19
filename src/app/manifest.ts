import type { MetadataRoute } from "next";

// Web app manifest — lets the app be added to a phone home screen and launch
// full-screen (standalone) with brand theming.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "أقم — Aqim",
    short_name: "أقم",
    description: "اقرأ بخشوع، لا بعادة",
    start_url: "/home",
    display: "standalone",
    background_color: "#f3eee3",
    theme_color: "#33546a",
    dir: "rtl",
    lang: "ar",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
