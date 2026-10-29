const CACHE = "apuntes-v1.4.0-beta";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./config.js",
  "./src/domain.js",
  "./src/cloud.js",
  "./src/oauth.js",
  "./src/install.js",
  "./src/native.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
];
self.addEventListener("install", (e) =>
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS))),
);
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("apuntes-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  const known = ASSETS.some(
    (path) => new URL(path, self.registration.scope).pathname === url.pathname,
  );
  if (!known && e.request.mode !== "navigate") return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok && url.search === "") {
          const copy = r.clone();
          e.waitUntil(caches.open(CACHE).then((c) => c.put(e.request, copy)));
        }
        return r;
      })
      .catch(async () => {
        const cached = await caches.match(e.request, { ignoreSearch: true });
        return (
          cached ||
          (e.request.mode === "navigate"
            ? await caches.match(
                new URL("./index.html", self.registration.scope),
              )
            : Response.error())
        );
      }),
  );
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) =>
        list.length
          ? list[0].focus()
          : self.clients.openWindow(self.registration.scope),
      ),
  );
});
