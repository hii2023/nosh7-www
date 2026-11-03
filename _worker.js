// www.nosh7.com exists only to clear the old store from visitors' browsers and
// send them to nosh7.com. We do not know the old service worker's file name, so
// any worker update check, at any path, gets the self-removing worker.
// No Clear-Site-Data header: Chrome holds the page blank while it clears the cache.
const KILL_WORKER = `
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
`;

// A saved old page may still ask the network for a script it does not have.
const KILL_PAGE = `
(function () {
  var go = function () { location.replace('https://nosh7.com' + location.pathname + location.search + location.hash); };
  var jobs = [];
  if ('serviceWorker' in navigator) { jobs.push(navigator.serviceWorker.getRegistrations().then(function (regs) { return Promise.all(regs.map(function (r) { return r.unregister(); })); })); }
  if (window.caches) { jobs.push(caches.keys().then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); })); }
  Promise.all(jobs).then(go, go);
  setTimeout(go, 1500);
})();
`;

function script(body) {
  return new Response(body, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
      'Service-Worker-Allowed': '/',
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const dest = request.headers.get('Sec-Fetch-Dest') || '';
    const isWorker = request.headers.get('Service-Worker') === 'script' || dest === 'serviceworker';

    console.log(JSON.stringify({ path: url.pathname, dest, isWorker }));

    if (isWorker) return script(KILL_WORKER);
    if (dest === 'script') return script(KILL_PAGE);

    const asset = await env.ASSETS.fetch(request);
    const res = new Response(asset.body, asset);
    if ((res.headers.get('Content-Type') || '').includes('text/html')) {
      res.headers.set('Cache-Control', 'no-store');
    }
    return res;
  },
};
