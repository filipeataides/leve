/* leve — funciona sem internet */
const V = 'leve-v3';
const APP = ['./', 'index.html', 'styles.css', 'core.js', 'app.js', 'records.js', 'jornada.js', 'studio.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'fonts/bricolage.woff2', 'fonts/figtree-400.woff2', 'fonts/figtree-600.woff2', 'fonts/figtree-700.woff2', 'fonts/figtree-800.woff2'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(APP)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V && k !== 'leve-fonts').map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.hostname.includes('fonts.googleapis.com') || u.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(caches.open('leve-fonts').then(async (c) => { const hit = await c.match(e.request); if (hit) return hit; const r = await fetch(e.request); c.put(e.request, r.clone()); return r; }));
    return;
  }
  if (u.origin !== location.origin) return;
  // app: rede primeiro (pega atualizações), cai para o cache sem internet
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then((r) => { const cp = r.clone(); caches.open(V).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((m) => m || caches.match('index.html'))));
});
