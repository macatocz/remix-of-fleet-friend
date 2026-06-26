/* Service worker for Web Push */
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = { title: "Notifikace", body: event.data ? event.data.text() : "" }; }
  const title = data.title || "Vozový park";
  const options = {
    body: data.body || "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: { link: data.link || "/" },
    tag: data.type || "general",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      if ("focus" in c) { await c.focus(); c.postMessage({ type: "navigate", link }); return; }
    }
    if (self.clients.openWindow) await self.clients.openWindow(link);
  })());
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));