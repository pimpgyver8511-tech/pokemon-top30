// Service Worker: nimmt Bilder aus dem Android-Teilen-Menü entgegen
// und gibt sie an die Schnellsuche weiter (dort: snapFromShare).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || !url.pathname.endsWith("/share-target")) return;
  event.respondWith((async () => {
    try {
      const form = await event.request.formData();
      const file = form.get("image");
      if (file) {
        const cache = await caches.open("geteilt");
        await cache.put("bild", new Response(file, { headers: { "content-type": file.type || "image/png" } }));
      }
    } catch {}
    return Response.redirect(new URL("./?geteilt=1#suche", self.registration.scope).href, 303);
  })());
});
