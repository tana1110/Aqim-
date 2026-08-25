// Appearance preference: "system" follows the device, "light"/"dark" force
// that palette regardless of device setting. Defaults to "dark" — the
// app-wide default appearance — for anyone who hasn't chosen yet.

export type ThemePref = "system" | "light" | "dark";

const KEY = "aqim-theme";
const LIGHT_COLOR = "#f3eee3";
const DARK_COLOR = "#1c2830";

export function loadTheme(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "system" || v === "light" || v === "dark") return v;
  } catch {}
  return "dark";
}

// Applies the preference to the document (data-theme attribute + the
// browser-chrome theme-color meta tag) and persists it.
export function applyTheme(pref: ThemePref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {}
  const root = document.documentElement;
  if (pref === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", pref);

  const isDark =
    pref === "dark" ||
    (pref === "system" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", isDark ? DARK_COLOR : LIGHT_COLOR);
}
