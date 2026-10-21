const V = 'tuk-v28';
const SHELL = ['/', '/app.js', '/style.css', '/schedule.js', '/schedule.css', '/flip.js', '/flip.css', '/recur.mjs', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-180.png'];

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
    if (req.mode === 'navigate') return e.respondWith(u.pathname.startsWith('/widget') ? swr(req) : swr(req, '/'));
    return e.respondWith(swr(req));
  }
  if (u.hostname === 'cdn.jsdelivr.net') return e.respondWith(cacheFirst(req, 'tuk-font'));
});

self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: '툭', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || '툭', { body: d.body || '', tag: d.tag || 'tuk', data: { url: d.url || '/' }, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { for (const c of cs) { if ('focus' in c) { c.navigate && c.navigate(url); return c.focus(); } } return self.clients.openWindow(url); }));
});
