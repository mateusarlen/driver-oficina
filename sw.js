const CACHE = 'driver-v3';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Sempre busca da rede primeiro para nunca travar arquivo antigo
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
