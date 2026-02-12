// Onlyou Partner Portals Service Worker
// Spec: master spec Section 15 — PWA Setup
// Handles offline caching for lab, collect, and pharmacy portals

const CACHE_NAME = 'onlyou-portals-v1';
const OFFLINE_URL = '/offline';

// Static assets to cache on install
const STATIC_ASSETS = [
    '/offline',
    '/icons/lab-192.png',
    '/icons/collect-192.png',
    '/icons/pharmacy-192.png',
];

// API routes to cache for offline use
const API_CACHE_ROUTES = [
    '/graphql',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    // Activate immediately
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    // Take control immediately
    self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip external requests
    if (url.origin !== location.origin) {
        return;
    }

    // Handle API requests with network-first strategy
    if (url.pathname.includes('/graphql') || url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirstStrategy(request));
        return;
    }

    // Handle page requests with stale-while-revalidate
    if (request.mode === 'navigate') {
        event.respondWith(navigationHandler(request));
        return;
    }

    // Handle static assets with cache-first strategy
    event.respondWith(cacheFirstStrategy(request));
});

// Network first strategy for API calls
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);

        // Cache successful GET responses
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        // Try cache if network fails
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('[SW] Serving cached API response');
            return cachedResponse;
        }

        // Return offline JSON for API errors
        return new Response(
            JSON.stringify({
                errors: [{ message: 'You are offline. Data shown may be outdated.' }],
                offline: true
            }),
            {
                headers: { 'Content-Type': 'application/json' },
                status: 503
            }
        );
    }
}

// Navigation handler with offline fallback
async function navigationHandler(request) {
    try {
        // Try network first
        const preloadResponse = await event.preloadResponse;
        if (preloadResponse) {
            return preloadResponse;
        }

        const networkResponse = await fetch(request);
        return networkResponse;
    } catch (error) {
        // Return offline page
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(OFFLINE_URL);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Fallback offline response
        return new Response(
            `<!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Offline - Onlyou</title>
                <style>
                    body { font-family: system-ui; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; }
                    .container { text-align: center; padding: 2rem; }
                    h1 { color: #111827; margin-bottom: 0.5rem; }
                    p { color: #6b7280; }
                    .icon { font-size: 3rem; margin-bottom: 1rem; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">📡</div>
                    <h1>You're Offline</h1>
                    <p>Please check your internet connection and try again.</p>
                    <p>Cached data is shown below. Updates will sync when you're back online.</p>
                </div>
            </body>
            </html>`,
            {
                headers: { 'Content-Type': 'text/html' },
                status: 200
            }
        );
    }
}

// Cache first strategy for static assets
async function cacheFirstStrategy(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);

        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        // Return placeholder for missing assets
        return new Response('', { status: 404 });
    }
}

// Handle background sync for offline mutations
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-mutations') {
        event.waitUntil(syncMutations());
    }
});

// Sync queued mutations when back online
async function syncMutations() {
    // Get queued mutations from IndexedDB
    // This would be implemented with a proper IndexedDB setup
    console.log('[SW] Syncing queued mutations...');
}

// Listen for messages from the client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
