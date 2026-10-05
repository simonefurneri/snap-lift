// Auto-generated during build. Do not edit directly.
const CACHE_VERSION = 'snaplift-build-1791202589496';
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
      .then(() => {
        // Do not force skipWaiting immediately to allow the client to show "Nuova versione disponibile"
      })
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
