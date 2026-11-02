// Replaces any service worker the old store installed on www.nosh7.com: clears its
// saved pages, removes itself, then reloads open tabs so they reach the new site.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    await self.clients.claim();
    var keys = await caches.keys();
    await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    await self.registration.unregister();
    var tabs = await self.clients.matchAll({ type: 'window' });
    tabs.forEach(function (tab) { tab.navigate(tab.url); });
  })());
});
