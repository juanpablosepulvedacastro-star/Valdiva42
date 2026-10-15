// Service worker: deja la app disponible sin conexión.
// - La app (HTML): primero la red, para ver siempre la última versión; sin señal, la copia guardada.
// - Lo demás (íconos, fuentes, Tailwind): copia guardada al instante y actualización en segundo plano.
const CACHE = 'valdivia42-v11';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  // cache: 'reload' evita guardar una copia vieja del caché HTTP del navegador.
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;

  if (req.mode === 'navigate' || (same && url.pathname.endsWith('.html'))) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./', copy)); }
          return res;
        })
        .catch(() => caches.match('./').then(r => r || caches.match('./index.html')))
    );
    return;
  }

  const key = same ? new Request(url.origin + url.pathname) : req;   // sin ?query: una sola copia por archivo
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(key);
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(key, res.clone());
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
