// Home-page widgets: each person chooses what their home shows.
// Stored on-device. Everything is visible by default — people who find it
// too busy can hide sections themselves via "Customize home."
export type WidgetKey = "tasks" | "misbaha" | "daily" | "review";
export const WIDGET_KEYS: WidgetKey[] = ["tasks", "misbaha", "daily", "review"];

const KEY = "aqim-widgets";

export function loadWidgets(): Record<WidgetKey, boolean> {
  const all: Record<WidgetKey, boolean> = {
    tasks: true,
    misbaha: true,
    daily: true,
    review: true,
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
