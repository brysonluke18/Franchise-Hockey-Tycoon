/* Breakaway service worker: the game works offline once installed.
   Game files: network first (so updates arrive), cache as fallback. Fonts: cache first. */
const CACHE = 'breakaway-v27';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
  './css/app.css', './js/data.js', './js/art.js', './js/model.js', './js/sim.js', './js/live.js', './js/state.js', './js/practice.js', './js/ui.js', './js/main.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html'))));
});
