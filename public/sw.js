// Auto-generated during build. Do not edit directly.
const CACHE_VERSION = 'snaplift-build-1791556650883';
const STATIC_CACHE = `snaplift-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `snaplift-dynamic-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/manifest.webmanifest',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/favicon.ico',
];

// Authentication routes that must NEVER be cached by the Service Worker
const AUTH_ROUTES = [
  '/login',
  '/auth',
  '/auth/callback',
  '/forgot-password',
  '/reset-password',
];

// 1. Install Event: Pre-cache app shell and offline page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

// 2. Activate Event: Clean old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// 3. Message Listener for skipWaiting and CLEAR_CACHES (triggered on logout)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
    );
  }
});

// 4. Fetch Event Strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Supabase API, /api/*, Authentication Routes, and external video media
  const isAuthRoute = AUTH_ROUTES.some((route) => url.pathname === route || url.pathname.startsWith(`${route}/`));
  const isSupabase = url.hostname.includes('supabase.co') || url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/');
  const isApiRoute = url.pathname.startsWith('/api/');
  const isExternalMedia = url.hostname.includes('youtube.com') || url.hostname.includes('googlevideo.com');

  if (isSupabase || isApiRoute || isAuthRoute || isExternalMedia) {
    return; // Bypass Service Worker cache completely, let browser handle directly
  }

  // A. Next.js Static Chunks and Assets (JS, CSS, Fonts, Icons) -> Cache First
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|woff2|woff|ttf|ico)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // B. HTML Navigation Requests -> Network First with Cache Fallback and /offline Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Try dynamic cache for the page
          const cachedPage = await caches.match(request);
          if (cachedPage) {
            return cachedPage;
          }
          // Fallback to offline page
          const offlinePage = await caches.match('/offline');
          return (
            offlinePage ||
            new Response('Nessuna connessione internet', {
              status: 503,
              statusText: 'Offline',
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          );
        })
    );
    return;
  }

  // C. Default Stale-While-Revalidate for other same-origin assets
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => null);

        return cachedResponse || fetchPromise;
      })
    );
  }
});

// 5. Push Notification Event Listener (Wakes up iOS/Android when locked or in other apps)
self.addEventListener('push', (event) => {
  let data = {
    title: 'Recupero Terminato! ⏰',
    body: 'È ora della prossima serie!',
    url: '/workout',
    tag: 'rest-timer',
  };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [300, 100, 300, 100, 400],
    tag: data.tag || 'rest-timer',
    renotify: true,
    data: {
      url: data.url || '/workout',
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 6. Notification Click Event Listener (Opens or focuses the relevant app window)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/workout';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window matching targetUrl path if available
      for (const client of windowClients) {
        if (client.url && client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise focus any open tab of the app and navigate
      if (windowClients.length > 0 && 'focus' in windowClients[0]) {
        if ('navigate' in windowClients[0] && targetUrl) {
          windowClients[0].navigate(targetUrl);
        }
        return windowClients[0].focus();
      }
      // Fallback: open window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
