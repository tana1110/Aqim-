// Home-page widgets: each person chooses what their home shows.
// Stored on-device. Only "daily" (today's ayah/dua/hadith — the most
// directly relevant companion to the prayer hero above it) defaults to
// visible; the rest start off and are one tap away via "Customize" —
// showing everything at once by default was the single biggest source of
// the home page feeling overwhelming on first use. Nothing is removed,
// people who want it back just turn it on.
export type WidgetKey = "tasks" | "misbaha" | "daily" | "review";
export const WIDGET_KEYS: WidgetKey[] = ["tasks", "misbaha", "daily", "review"];

const KEY = "aqim-widgets";

export function loadWidgets(): Record<WidgetKey, boolean> {
  const all: Record<WidgetKey, boolean> = {
    tasks: false,
    misbaha: false,
    daily: true,
    review: false,
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Record<WidgetKey, boolean>>;
      for (const k of WIDGET_KEYS) {
        if (typeof parsed[k] === "boolean") all[k] = parsed[k]!;
      }
    }
  } catch {}
  return all;
}

export function saveWidgets(w: Record<WidgetKey, boolean>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(w));
    window.dispatchEvent(new Event("aqim-widgets-changed"));
  } catch {}
}
