// service-worker.js

const CACHE_NAME = 'mann-mitra-cache-v1';

// On install, cache the app shell. Other assets are cached on the fly by the fetch handler.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: Caching App Shell');
      return cache.addAll([
        '/',
        '/index.html',
      ]);
    }).catch(error => {
      console.error('Service Worker: Caching failed during install', error);
    })
  );
});

// On activate, clean up old caches.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// On fetch, use a cache-first, then network strategy.
self.addEventListener('fetch', event => {
  // For API calls, let the browser handle it so the app can detect online/offline status.
  if (event.request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // If the resource is in the cache, return it.
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise, fetch from the network.
        return fetch(event.request).then(networkResponse => {
          // If a valid response is received, clone it and cache it for future use.
          if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) { // status 0 for opaque responses from CDNs
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
          }
          return networkResponse;
        });
      })
  );
});
