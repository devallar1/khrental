/**
 * Stitch raster slippy-map tiles ({z}/{x}/{y}) into a single canvas texture
 * covering a lat/lng bounding box. We use this to put satellite/streets
 * imagery under the threlte scene without depending on MapTiler's Static
 * Maps service (which needs a separately-permissioned API key).
 */

const TILE_SIZE = 256;

const lng2tileX = (lng, z) => ((lng + 180) / 360) * (1 << z);
const lat2tileY = (lat, z) => {
	const rad = (lat * Math.PI) / 180;
	return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * (1 << z);
};
const tileX2lng = (x, z) => (x / (1 << z)) * 360 - 180;
const tileY2lat = (y, z) => {
	const n = Math.PI - (2 * Math.PI * y) / (1 << z);
	return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

/** Pick a zoom level so the requested span lands in roughly 4–16 tiles. */
export function pickZoom(spanMeters, lat) {
	// Mercator metres-per-tile-edge at zoom z, latitude lat
	// = (40075016.686 * cos(lat)) / 2^z
	const tileMetresAtZ = (z) => (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (1 << z);
	for (let z = 19; z >= 14; z--) {
		const m = tileMetresAtZ(z);
		// Aim for ~2 tiles across the span at most → smallest z where span < 2 * tile metres
		if (spanMeters < 2 * m) return z;
	}
	return 14;
}

/**
 * Returns { canvas, bounds } once all tiles have loaded. `bounds` is the
 * tile-aligned lat/lng box the canvas actually covers — usually slightly
 * larger than the requested box because tiles snap to whole units.
 */
export async function stitchTiles({
	minLng,
	minLat,
	maxLng,
	maxLat,
	urlTemplate,
	zoom
}) {
	const tx0 = Math.floor(lng2tileX(minLng, zoom));
	const tx1 = Math.floor(lng2tileX(maxLng, zoom));
	const ty0 = Math.floor(lat2tileY(maxLat, zoom)); // smaller Y = north
	const ty1 = Math.floor(lat2tileY(minLat, zoom));

	const tilesW = tx1 - tx0 + 1;
	const tilesH = ty1 - ty0 + 1;
	const canvas = document.createElement('canvas');
	canvas.width = tilesW * TILE_SIZE;
	canvas.height = tilesH * TILE_SIZE;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Could not get 2d context');

	const loadOne = (tx, ty) => new Promise((resolve, reject) => {
		const url = urlTemplate
			.replace('{z}', String(zoom))
			.replace('{x}', String(tx))
			.replace('{y}', String(ty));
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => {
			ctx.drawImage(img, (tx - tx0) * TILE_SIZE, (ty - ty0) * TILE_SIZE);
			resolve(undefined);
		};
		img.onerror = () => reject(new Error(`tile failed: ${url}`));
		img.src = url;
	});

	const jobs = [];
	for (let ty = ty0; ty <= ty1; ty++) {
		for (let tx = tx0; tx <= tx1; tx++) jobs.push(loadOne(tx, ty));
	}
	await Promise.all(jobs);

	return {
		canvas,
		bounds: {
			minLng: tileX2lng(tx0, zoom),
			maxLng: tileX2lng(tx1 + 1, zoom),
			minLat: tileY2lat(ty1 + 1, zoom),
			maxLat: tileY2lat(ty0, zoom)
		}
	};
}

/** URL templates we use. Both Esri layers are free with attribution. */
export const TILE_URLS = {
	'esri-imagery':
		'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
	'esri-streets':
		'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
};
