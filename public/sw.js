// Aqim service worker — notifications, installability, and OFFLINE app.
//
// Three layers of caching:
//  - SHELL_CACHE: the pages themselves (navigations) — network-first, so
//    updates reach users instantly online, but the last successfully
//    loaded copy of each page still renders with no connection at all.
//  - STATIC_CACHE: Next.js's content-hashed JS/CSS bundles under
//    /_next/static/ — cache-first, safe forever (a new build gets new
//    hashed filenames, it never reuses a stale one).
//  - MUSHAF_CACHE / AUDIO_CACHE: Quran text/layout/fonts and recitation
//    audio — cache-first, fills in as the user reads/listens.
const SHELL_CACHE = "aqim-shell-v1";
const STATIC_CACHE = "aqim-static-v1";
const MUSHAF_CACHE = "aqim-mushaf-v1";
const AUDIO_CACHE = "aqim-audio-v1";
const KNOWN_CACHES = [SHELL_CACHE, STATIC_CACHE, MUSHAF_CACHE, AUDIO_CACHE];

// Core routes worth having offline from the very first successful launch,
// not only after the user happens to have opened each one while online.
const CORE_ROUTES = [
  "/home",
  "/quran",
  "/adhkar",
  "/tasbih",
  "/settings",
  "/setup",
  "/qibla",
  "/history",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Best-effort — offline or a slow first install shouldn't block
      // activation; whatever succeeds is a bonus.
      await Promise.all(
        CORE_ROUTES.map((path) =>
          fetch(path)
            .then((res) => (res.ok ? cache.put(path, res) : null))
            .catch(() => {}),
        ),
      );
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => !KNOWN_CACHES.includes(n))
          .map((n) => caches.delete(n)),
      );
      self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Page navigations: try the network first (so updates and per-request
  // logic always win when online); fall back to the last cached copy of
  // this exact page, then to a cached /home, when there's no connection.
  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(event.request);
          if (res.ok) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put(event.request, res.clone());
          }
          return res;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          return (
            (await cache.match(event.request)) ??
            (await cache.match(new Request(url.origin + "/home"))) ??
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  // Next.js's own content-hashed build output — a given hash is immutable
  // by construction, so cache-first is always safe.
  if (sameOrigin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(event.request);
        if (hit) return hit;
        const res = await fetch(event.request);
        if (res.ok) cache.put(event.request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Quran text/layout/font APIs: cache-first (immutable), fill the cache
  // as you read.
  const isMushaf =
    sameOrigin &&
    (url.pathname === "/api/mushaf" ||
      url.pathname === "/api/surahs" ||
      url.pathname === "/api/mushaf-exact" ||
      url.pathname.startsWith("/api/qcf-font/"));
  // Recitation audio (verified reciter files from Islamic Network CDN).
  const isAudio =
    url.hostname === "cdn.islamic.network" && url.pathname.includes("/audio/");

  if (!isMushaf && !isAudio) return;

  if (isAudio) {
    // The audio CDN sends no CORS headers — NEVER force a cors fetch here
    // (it fails and playback dies). Pass the media element's own request
    // through untouched; cache full (non-range) responses opportunistically.
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const hit = await cache.match(url.href, { ignoreVary: true });
        if (hit) return hit;
        const res = await fetch(event.request);
        if (!event.request.headers.has("range")) {
          try {
            await cache.put(url.href, res.clone());
          } catch {}
        }
        return res;
      }),
    );
    return;
  }

  event.respondWith(
    caches.open(MUSHAF_CACHE).then(async (cache) => {
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
