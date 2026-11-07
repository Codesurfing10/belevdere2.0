/* Belevdere service worker — conservative offline shell.
 * - Caches ONLY the static offline page, icons, and immutable /_next/static build assets.
 * - NEVER caches or intercepts /api/*, /admin*, checkout/payment, or any non-GET request.
 * - Page navigations are always fetched from the network (never cached), falling back to
 *   /offline.html only when the network is unavailable, so personal booking data is never stored.
 */
const VERSION = 'belevdere-static-v1';
const PRECACHE = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isSensitive(url) {
  const p = url.pathname;
  return p.startsWith('/api/') || p.startsWith('/admin') || p.includes('checkout') || p.includes('paypal');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Mapbox, PayPal, Stripe etc: untouched
  if (isSensitive(url)) return;

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok && res.type === 'basic') {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
  }
});
