// DayBloom service worker.
//
// 1. When a page can't load because the device is offline, show a friendly
//    offline page instead of the browser's error. It never caches pages, API
//    responses or anything personal. Bump CACHE when offline.html changes.
// 2. Show reminder notifications sent by the send-reminders Edge Function,
//    and open the app when one is tapped.

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

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : "" }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "DayBloom", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      // One per kind: a newer reminder replaces an older one.
      tag: data.tag || "daybloom",
      data: { url: data.url || "/today" },
    }),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  // Only ever open pages of this app.
  const target = new URL(
    event.notification.data?.url || "/today",
    self.location.origin,
  )
  if (target.origin !== self.location.origin) return
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        const open = windows.find((w) => w.url.startsWith(self.location.origin))
        if (open) {
          return open.focus().then((w) => w.navigate(target.href))
        }
        return self.clients.openWindow(target.href)
      }),
  )
})
