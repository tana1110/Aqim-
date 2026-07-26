// Aqim service worker — notifications, installability, and OFFLINE Quran.
// App pages/JS always come from the network (updates reach users instantly);
// only immutable Quran content is cached: Mushaf page text and recitation
// audio, so reading and listening work with no connection.
const MUSHAF_CACHE = "aqim-mushaf-v1";
const AUDIO_CACHE = "aqim-audio-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Quran text APIs: cache-first (immutable), fill the cache as you read.
  const isMushaf =
    url.origin === self.location.origin &&
    (url.pathname === "/api/mushaf" || url.pathname === "/api/surahs");
  // Recitation audio (verified reciter files from Islamic Network CDN).
  const isAudio =
    url.hostname === "cdn.islamic.network" && url.pathname.includes("/audio/");

  if (!isMushaf && !isAudio) return;

  event.respondWith(
    caches.open(isAudio ? AUDIO_CACHE : MUSHAF_CACHE).then(async (cache) => {
      // Match/fetch by URL (ignoring range headers) so partial audio
      // requests still hit the cached full file.
      const hit = await cache.match(url.href, { ignoreVary: true });
      if (hit) return hit;
      const res = await fetch(url.href);
      if (res.ok && res.status === 200) cache.put(url.href, res.clone());
      return res;
    }),
  );
});

// Server-sent reminders (web push) — works even when the app is closed.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title || "أقِم", {
      body: data.body || "",
      icon: "/icon.svg",
      dir: "auto",
      data: { url: data.url || "/home" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/home";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate?.(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
