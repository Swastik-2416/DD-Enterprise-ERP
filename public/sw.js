// DD Enterprise ERP - Service Worker
const CACHE_NAME = 'dd-enterprise-v1'
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/logo.png',
  '/manifest.json'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {
        // Continue even if some precache assets fail
      })
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            return caches.delete(name)
          }
        })
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return

  // Skip chrome-extension, non-http schemes, and api mutations
  if (!event.request.url.startsWith('http')) return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses for shell assets
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache)
          })
        }
        return response
      })
      .catch(async () => {
        // Network failed, serve from cache
        const cached = await caches.match(event.request)
        if (cached) return cached

        // Fallback for HTML navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html')
        }

        return new Response('Offline: Content unavailable without network connection.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        })
      })
  )
})
