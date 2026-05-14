const CACHE = 'neuesilben-v1';

self.addEventListener('install', e => {
  e.waitUntil(
    // NUR index.html und manifest cachen – KEINE .bin/.data/.wasm (zu groß, bricht XHR)
    caches.open(CACHE).then(c => c.addAll(['./index.html', './manifest.json']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const path = new URL(e.request.url).pathname;

  // Binärdateien nie anfassen – XHR braucht natives arraybuffer, SW würde es brechen
  if (path.endsWith('.bin') || path.endsWith('.data') || path.endsWith('.wasm')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      });
    })
  );
});
