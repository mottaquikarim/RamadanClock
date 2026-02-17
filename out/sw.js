const CACHE_NAME = 'ramadan-clock-20260216-17';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

// Install - cache static assets (but not index.html - always fetch fresh)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).catch(() => {
      // Cache API may be blocked in restricted WebViews (e.g. Instagram)
    })
  );
  self.skipWaiting();
});

// Activate - clean up ALL old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).catch(() => {
      // Cache API may be blocked in restricted WebViews
    })
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // For HTML pages, network first but cache the response for offline
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the fresh response for offline use
          try {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            }).catch(() => {});
          } catch(e) {}
          return response;
        })
        .catch(() => {
          return caches.match(request).catch(() => fetch(request));
        })
    );
    return;
  }

  // For API requests, network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          try {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            }).catch(() => {});
          } catch(e) {}
          return response;
        })
        .catch(() => {
          return caches.match(request).catch(() => fetch(request));
        })
    );
    return;
  }

  // For other static assets, cache first
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        if (response.status === 200) {
          try {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            }).catch(() => {});
          } catch(e) {}
        }
        return response;
      });
    }).catch(() => {
      return fetch(request);
    })
  );
});
