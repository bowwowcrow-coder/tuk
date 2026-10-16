const V = 'tuk-v3';
const SHELL = ['/', '/app.js', '/style.css', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('tuk-v') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function cacheFirst(req, name) {
  const c = await caches.open(name);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') c.put(req, res.clone());
  return res;
}
async function swr(req, key) {
  const c = await caches.open(V);
  const hit = await c.match(key || req, { ignoreSearch: true });
  const net = fetch(req).then(res => { if (res.ok) c.put(key || req, res.clone()); return res; }).catch(() => hit);
  return hit || net;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === location.origin) {
    if (u.pathname.startsWith('/api/img/')) return e.respondWith(cacheFirst(req, 'tuk-img'));
    if (u.pathname.startsWith('/api/')) return;
    if (req.mode === 'navigate') return e.respondWith(swr(req, '/'));
    return e.respondWith(swr(req));
  }
  if (u.hostname === 'cdn.jsdelivr.net') return e.respondWith(cacheFirst(req, 'tuk-font'));
});
