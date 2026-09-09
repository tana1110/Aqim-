// Real immersive fullscreen, routed through the native Android shell when
// present (Android WebView's support for the HTML5 Fullscreen API on a
// plain element — not a <video> — is unreliable; the native app exposes
// this bridge specifically because requestFullscreen() alone silently does
// nothing there). Falls back to the standard Fullscreen API for the
// website itself (a normal browser tab, or the old TWA build).
declare global {
  interface Window {
    AndroidApp?: { setImmersive?: (on: boolean) => void };
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
