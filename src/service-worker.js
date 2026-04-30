/**
 * Service worker — long-lived cache for map tile responses.
 *
 * Why: the Esri / MapTiler / OpenFreeMap tile servers send sensible
 * Cache-Control headers, but the browser HTTP cache is volume-limited
 * and gets evicted aggressively (and DevTools "Disable cache" silently
 * bypasses it). For a property dashboard where the imagery doesn't
 * change for the lifetime of the lease, putting the tiles in a
 * Service-Worker-managed cache keeps them around for ~30 days
 * regardless of HTTP cache behaviour.
 *
 * Strategy: cache-first with stale-while-revalidate. Cached responses
 * get a synthetic `sw-cached-at` header so we can age them out without
 * a separate index. Only requests to known tile origins are touched —
 * everything else falls through to default browser behaviour.
 */

const TILE_CACHE = 'kh-map-tiles-v1';

const TILE_HOSTNAMES = new Set([
	'server.arcgisonline.com',
	'api.maptiler.com',
	'tiles.openfreemap.org',
	'basemaps.cartocdn.com'
]);

const TILE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(
				keys.map((k) => (k === TILE_CACHE ? null : caches.delete(k)))
			);
			await self.clients.claim();
		})()
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (TILE_HOSTNAMES.has(url.hostname)) {
		event.respondWith(handleTileRequest(request));
	}
	// Anything else: let it fall through to the network.
});

async function handleTileRequest(request) {
	const cache = await caches.open(TILE_CACHE);
	const cached = await cache.match(request);

	if (cached) {
		const cachedAt = Number(cached.headers.get('sw-cached-at') || 0);
		const fresh = cachedAt && Date.now() - cachedAt < TILE_TTL_MS;
		if (fresh) return cached;

		// Stale: serve immediately, refresh in the background.
		revalidate(request, cache).catch(() => {});
		return cached;
	}

	try {
		const response = await fetch(request);
		if (response.ok) {
			storeTile(cache, request, response.clone()).catch(() => {});
		}
		return response;
	} catch (err) {
		// Offline / DNS fail — fall back to whatever's cached even if stale.
		if (cached) return cached;
		throw err;
	}
}

async function revalidate(request, cache) {
	const response = await fetch(request);
	if (response.ok) {
		await storeTile(cache, request, response);
	}
}

async function storeTile(cache, request, response) {
	if (!response.ok) return;
	if (response.type === 'opaque') return; // skip no-cors responses we can't actually read
	const headers = new Headers(response.headers);
	headers.set('sw-cached-at', String(Date.now()));
	const body = await response.blob();
	const tagged = new Response(body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
	await cache.put(request, tagged);
}
