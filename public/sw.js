/* Panyor Hall PWA service worker — offline-tolerant app shell.
 * Strategy: navigation requests go network-first with an offline
 * fallback to the cached login page; static assets are cache-first;
 * API/auth POSTs are never cached. Cache version bump on changes. */
const CACHE = "panyor-v3"
const OFFLINE_URL = "/login"
const PRECACHE = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon-32.png",
]

// Next.js owns its own chunk caching (content-hashed URLs + headers).
// Never serve framework chunks from this cache — stale chunks crash the app.
const BYPASS_PREFIXES = ["/_next/", "/api/auth/"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (BYPASS_PREFIXES.some((p) => url.pathname.startsWith(p))) return
  if (url.pathname.startsWith("/api/")) {
    // API reads: network-first, cache fallback for offline viewing.
    // Only successful responses are cached — never persist errors.
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return res
        })
        .catch(() => caches.match(request))
    )
    return
  }
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error()))
    )
    return
  }
  // Static assets: cache-first (successful responses only).
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return res
        })
    )
  )
})

// Local notifications scheduled from the app land here when the app
// shows them via registration.showNotification; clicks refocus the app.
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(event.notification.data?.url ?? "/")
    })
  )
})
