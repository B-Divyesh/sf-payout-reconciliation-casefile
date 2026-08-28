const VERSION = 'casefile-v1.0.1';
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;
const CORE = ['/', '/index.html', '/offline.html', '/manifest.webmanifest', '/assets/hero-casefile.webp', '/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    // Vite fingerprints its entry JS/CSS. Read the built document during
    // installation so the exact current asset names are part of the shell,
    // rather than relying on the browser's evictable HTTP cache offline.
    const documentResponse = await fetch('/index.html', { cache: 'reload' });
    if (!documentResponse.ok) throw new Error('Could not precache the app shell.');
    const documentText = await documentResponse.clone().text();
    const entryAssets = [...documentText.matchAll(/(?:src|href)="(\/assets\/[^"?#]+(?:\?[^"#]*)?)"/g)]
      .map((match) => match[1]);
    await cache.addAll([...new Set([...CORE, ...entryAssets])]);
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => ![SHELL, RUNTIME].includes(key)).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (event) => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) {
    if (url.hostname === 'api.sociobot.in') event.respondWith(fetch(event.request));
    return;
  }
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then((response) => { const clone = response.clone(); caches.open(RUNTIME).then((cache) => cache.put(event.request, clone)); return response; }).catch(async () => (await caches.match(event.request)) || (await caches.match('/index.html')) || caches.match('/offline.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => { if (response.ok) { const clone = response.clone(); caches.open(RUNTIME).then((cache) => cache.put(event.request, clone)); } return response; })));
});
