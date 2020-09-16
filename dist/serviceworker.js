const cacheName = 'v1';
const cacheAssets = [
  '/',
  'index.html',
  'pages/days.html',
  'pages/hourly.html',
  'pages/radar.html',
  'pages/today.html',
  '/css/style.css',
  '/assets/snow flake.svg',
  '/js/main.js',
  'favicon.ico',
];

// Add install event listener
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(cacheName).then((cache) => {
      cache.addAll(cacheAssets).then(() => self.skipWaiting());
    })
  );
});

// Add activate event listner
self.addEventListener('activate', (e) => {
  //Remove unwanted caches
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== cacheName) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Add Fetch Event to serve files
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
