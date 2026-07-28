/* ===========================================================
 * SYNC-STORE Point of Sale System — Service Worker
   Handles offline caching, auto-update, and background sync
   =========================================================== */

const SW_VERSION = '2.0.0';
const STATIC_CACHE = 'pos-static-v2';
const IMAGE_CACHE = 'pos-images-v2';
const API_CACHE = 'pos-api-v2';

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  'index.html',
  'login.html',
  'salesperson.html',
  'manager.html',
  'style.css',
  'script.js',
  'api.js',
  'sw.js',
  'manifest.json',
  'db.js',
  'syncService.js'
];

// ===========================================================
// INSTALL — Pre-cache all static assets
// ===========================================================
self.addEventListener('install', (event) => {
  console.log(`[SW v${SW_VERSION}] Installing...`);
  self.skipWaiting();

  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Cache what we can; don't fail if something is missing (e.g. manifest.json first time)
      const results = await Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Failed to pre-cache ${url}:`, err.message);
          })
        )
      );
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      console.log(`[SW] Pre-cached ${succeeded}/${PRECACHE_ASSETS.length} assets`);
    })()
  );
});

// ===========================================================
// ACTIVATE — Clean up old caches
// ===========================================================
self.addEventListener('activate', (event) => {
  console.log(`[SW v${SW_VERSION}] Activating...`);

  event.waitUntil(
    (async () => {
      const cacheWhitelist = [STATIC_CACHE, IMAGE_CACHE, API_CACHE];
      const allCaches = await caches.keys();

      await Promise.all(
        allCaches
          .filter((name) => !cacheWhitelist.includes(name))
          .map((name) => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );

      // Take control of all clients immediately
      await self.clients.claim();
      console.log(`[SW v${SW_VERSION}] Active and controlling clients`);
    })()
  );
});

// ===========================================================
// FETCH — Smart caching strategies
// ===========================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ---- API requests: Network-first with cache fallback ----
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }

  // ---- Images: Cache-first with background update ----
  if (request.destination === 'image' || /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url.pathname)) {
    event.respondWith(cacheFirstWithBackgroundUpdate(request, IMAGE_CACHE));
    return;
  }

  // ---- Static assets (JS, CSS, fonts): Cache-first ----
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    /\.(js|css|woff2?|ttf|otf|eot)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirstWithBackgroundUpdate(request, STATIC_CACHE));
    return;
  }

  // ---- HTML pages / root: Cache-first ----
  if (
    request.destination === 'document' ||
    url.pathname === '/' ||
    /\.html$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirstWithBackgroundUpdate(request, STATIC_CACHE));
    return;
  }

  // ---- Manifest: Cache-first ----
  if (url.pathname === '/manifest.json') {
    event.respondWith(cacheFirstWithBackgroundUpdate(request, STATIC_CACHE));
    return;
  }

  // ---- Everything else: Network-first with cache fallback ----
  event.respondWith(networkFirstWithCache(request, STATIC_CACHE));
});

// ===========================================================
// CACHE STRATEGIES
// ===========================================================

/**
 * Cache-first: Serve from cache immediately, update cache in background.
 * If not in cache, fetch from network.
 */
async function cacheFirstWithBackgroundUpdate(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    // Fire-and-forget: update cache in background
    fetchAndCache(request, cacheName).catch(() => {});
    return cached;
  }

  // Not in cache — fetch from network
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cacheResponse(request, response.clone(), cacheName);
    }
    return response;
  } catch (err) {
    // Offline and not in cache — return offline fallback for documents
    if (request.destination === 'document') {
      const fallback = await caches.match('/');
      if (fallback) return fallback;
    }
    throw err;
  }
}

/**
 * Network-first: Try network first, fall back to cache if offline.
 * Always updates cache from network when online.
 */
async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cacheResponse(request, response.clone(), cacheName);
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // For API requests that fail and aren't cached, return a structured error
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({ error: 'offline', message: 'You are offline. Data will sync when connection is restored.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    throw err;
  }
}

/**
 * Fetch a resource and store it in cache (fire-and-forget / background).
 */
async function fetchAndCache(request, cacheName) {
  const response = await fetch(request);
  if (response && response.ok) {
    await cacheResponse(request, response.clone(), cacheName);
  }
}

/**
 * Store a response in the specified cache.
 */
async function cacheResponse(request, response, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
  } catch (err) {
    // Silently fail — cache storage may be full
    console.warn('[SW] Failed to cache:', request.url, err.message);
  }
}

// ===========================================================
// MESSAGE HANDLING — Communication with the page
// ===========================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHES') {
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      console.log('[SW] All caches cleared');
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: true });
      }
    });
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ version: SW_VERSION });
    }
  }
});
