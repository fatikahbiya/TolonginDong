
const CACHE_NAME = "pwa-template-v2";
const BASE_URL = self.registration.scope;

const urlsToCache = [
  `${BASE_URL}`,
  `${BASE_URL}index.html`,
  `${BASE_URL}offline.html`,
  `${BASE_URL}assets/style.css`,
  `${BASE_URL}manifest.json`,
  `${BASE_URL}icons/icon 192.png`,
  `${BASE_URL}icons/icon 512.png`,
];

// Install Service Worker & simpan file ke cache
self.addEventListener("install", event => {
  self.skipWaiting(); // langsung aktif tanpa reload manual
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.error("Cache gagal dimuat:", err))
  );
});

// Aktivasi dan hapus cache lama
self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("Menghapus cache lama:", key);
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim(); // langsung klaim kontrol ke halaman
    })()
  );
});

// Fetch event: cache-first untuk file lokal, network-first untuk API
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  // Abaikan permintaan Chrome Extension, analytics, dll.
  if (url.protocol.startsWith("chrome-extension")) return;
  if (request.method !== "GET") return;

  // File lokal (statis)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(response => {
        return (
          response ||
          fetch(request).catch(() => caches.match(`${BASE_URL}offline.html`))
        );
      })
    );
  } 
  // Resource eksternal (API, CDN, dsb.)
  else {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
  }
});
