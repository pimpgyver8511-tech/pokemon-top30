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

// Kartendaten und Claude-SDK auf dem Handy zwischenspeichern ("stale-while-revalidate"):
// sofort aus dem Speicher antworten, im Hintergrund die neue Version holen.
// So ist die Seite auch beim Start über das Teilen-Menü schnell bereit.
const DATA_CACHE = "daten-v1";
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isData = url.origin === self.location.origin && /\/data\/(all|asia|old|species)\.json$/.test(url.pathname);
  const isSdk = url.href.startsWith("https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@");
  if (!isData && !isSdk) return;
  event.respondWith((async () => {
    const cache = await caches.open(DATA_CACHE);
    const key = url.origin + url.pathname;
    const cached = await cache.match(key);
    const network = fetch(req).then((res) => {
      if (res.ok) cache.put(key, res.clone());
      return res;
    });
    if (cached) {
      event.waitUntil(network.catch(() => {}));
      return cached;
    }
    return network;
  })());
});
