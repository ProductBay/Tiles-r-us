const CACHE_NAME = "tile-it-3d-cache-v1";
const urlsToCache = ["/", "/index.html"];

// Install event
self.addEventListener("install", (event) => {
  console.log("Tile-it-3D Service Worker: Installed ✅");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("Tile-it-3D Service Worker: Active 🎉");
});

// Fetch event
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
