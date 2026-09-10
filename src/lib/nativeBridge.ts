// Real immersive fullscreen, routed through the native Android shell when
// present (Android WebView's support for the HTML5 Fullscreen API on a
// plain element — not a <video> — is unreliable; the native app exposes
// this bridge specifically because requestFullscreen() alone silently does
// nothing there). Falls back to the standard Fullscreen API for the
// website itself (a normal browser tab, or the old TWA build).
declare global {
  interface Window {
    AndroidApp?: {
      setImmersive?: (on: boolean) => void;
      updateWidgets?: (json: string) => void;
    };
  }
}

export function enterImmersive() {
  if (typeof window === "undefined") return;
  if (window.AndroidApp?.setImmersive) {
    window.AndroidApp.setImmersive(true);
    return;
  }
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) {
    el.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
  }
}

export function exitImmersive() {
  if (typeof window === "undefined") return;
  if (window.AndroidApp?.setImmersive) {
    window.AndroidApp.setImmersive(false);
    return;
  }
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

// Pushes current glance data (next prayer, tasbih, adhkar, wird) into the
// native shell's SharedPreferences so the four home-screen widgets — which
// run in their own process and can't read the WebView's localStorage — have
// something to show. No-ops outside the native app.
export interface WidgetSyncPayload {
  prayer?: { label: string; time: string } | null;
  tasbih?: { phrase: string; count: number; target: number };
  adhkar?: { morning: boolean; evening: boolean; sleep: boolean };
  wird?: { done: boolean; streak: number };
}

export function pushWidgetData(payload: WidgetSyncPayload) {
  if (typeof window === "undefined") return;
  window.AndroidApp?.updateWidgets?.(JSON.stringify(payload));
}
