importScripts('./precache-manifest.js');

const CACHE_PREFIX = 'yet-another-tuner-';
// Build content changes the version, allowing activation to remove stale shells.
const CACHE_NAME = `${CACHE_PREFIX}${self.__PRECACHE.version}`;
const SCOPE_URL = new URL('./', self.registration.scope);
const INDEX_URL = new URL('index.html', SCOPE_URL).href;
const PRECACHE_URLS = self.__PRECACHE.assets.map(asset => new URL(asset, SCOPE_URL).href);

self.addEventListener('install', event => {
	event.waitUntil(caches.open(CACHE_NAME)
		.then(cache => cache.addAll(PRECACHE_URLS))
		.then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
	event.waitUntil(caches.keys()
		.then(keys => Promise.all(keys
			.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
			.map(key => caches.delete(key))))
		.then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
	if (event.request.method !== 'GET') return;
	const requestUrl = new URL(event.request.url);
	if (requestUrl.origin !== location.origin || !requestUrl.href.startsWith(SCOPE_URL.href)) return;

	if (event.request.mode === 'navigate') {
		// Prefer a fresh deployment online, but retain a complete offline entry page.
		event.respondWith(fetch(event.request)
			.then(response => {
				if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(INDEX_URL, response.clone()));
				return response;
			})
			.catch(() => caches.match(INDEX_URL)));
		return;
	}

	// Build assets are content-hashed, so cached copies stay valid for their URL.
	event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
