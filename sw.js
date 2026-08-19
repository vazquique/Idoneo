// Service worker mínimo -- solo existe para que el sitio cumpla los
// requisitos de instalación (PWA) y para que la página ya visitada
// cargue algo si el visitante pierde conexión. No cachea nada de
// Firebase (los datos siempre deben venir frescos): solo el shell
// HTML/CSS/JS de páginas que ya visitaste.
const CACHE_NAME = 'idoneo-shell-v1';
const CORE_ASSETS = ['favicon.svg', 'manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first: siempre intenta traer la versión real primero (los
// perfiles, precios y disponibilidad cambian todo el tiempo), y solo
// cae al caché si de plano no hay conexión.
self.addEventListener('fetch', (event) => {
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return; // no toca Firebase, fuentes, etc.

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
