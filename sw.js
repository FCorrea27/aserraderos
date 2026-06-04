// ═══════════════════════════════════════════════════════════
// Service Worker — Relevamiento Aserraderos · Proyecto Ituzaingó
// Cache offline real. Incrementar CACHE_VERSION en cada deploy.
// ═══════════════════════════════════════════════════════════
const CACHE_VERSION = 'aserraderos-v1';
const ASSETS = [
  './',
  './relevamiento_aserraderos.html',
  './index.html'
];

// Instalación: precachear el shell de la app
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(ASSETS).catch(() => {/* algunos paths pueden no existir según deploy */})
    )
  );
  self.skipWaiting();
});

// Activación: limpiar caches viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first para el shell; nunca cachear el POST a Apps Script
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // No interceptar métodos distintos de GET (los POST de sincronización van directo a la red)
  if (req.method !== 'GET') return;

  // No cachear llamadas a Google (Apps Script / Sheets)
  const url = new URL(req.url);
  if (url.hostname.includes('google.com') || url.hostname.includes('googleusercontent.com')) {
    return; // dejar pasar a la red
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // cachear navegación y assets del mismo origen
          if (res && res.status === 200 && url.origin === self.location.origin) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => {
          // fallback offline: devolver el HTML principal para navegación
          if (req.mode === 'navigate') {
            return caches.match('./relevamiento_aserraderos.html') || caches.match('./');
          }
        });
    })
  );
});
