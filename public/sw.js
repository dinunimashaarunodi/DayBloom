// DayBloom service worker.
//
// Its only job: when a page can't load because the device is offline, show a
// friendly offline page instead of the browser's error. It never caches
// pages, API responses or anything personal, and it doesn't queue writes
// (offline writes are postponed). Bump CACHE when offline.html changes.

const CACHE = "daybloom-offline-v3"
const OFFLINE_URL = "/offline.html"

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  // Only full page loads; everything else goes to the network untouched.
  if (event.request.mode !== "navigate") return
  event.respondWith(
    fetch(event.request).catch(() =>
      caches
        .match(OFFLINE_URL)
        .then((response) => response ?? Response.error()),
    ),
  )
})
