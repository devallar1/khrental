/**
 * Helpers for converting boundary_geojson (lng/lat polygons) into local
 * meter-coords usable by the threlte scene.
 *
 * Three.js convention: +X east, +Y up, +Z south. Geographic north therefore
 * maps to -Z. We use a flat equirectangular projection — accurate enough at
 * city-block scale (errors << 1 m for plots under a kilometre wide).
 */

const M_PER_DEG_LAT = 110540;
const M_PER_DEG_LNG_AT_EQUATOR = 111320;

/** Convert a (lng, lat) pair to [x, z] meters from a center anchor. */
export function geoToLocal(lng, lat, center) {
	const cosLat = Math.cos((center.lat * Math.PI) / 180);
	const x = (lng - center.lng) * M_PER_DEG_LNG_AT_EQUATOR * cosLat;
	const z = (center.lat - lat) * M_PER_DEG_LAT;  // north is -Z
	return [x, z];
}

/**
 * Convert a GeoJSON Polygon's outer ring to local [x, z] tuples.
 * Drops the duplicate closing vertex if present so the array describes a
 * unique ring of points (Three.js Shape closes for us).
 */
export function polygonOuterRing(geometry, center) {
	if (!geometry || geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates)) {
		return [];
	}
	const ring = geometry.coordinates[0] || [];
	const local = ring.map(([lng, lat]) => geoToLocal(lng, lat, center));
	// Drop closing duplicate vertex (GeoJSON spec: rings are closed)
	if (local.length > 1) {
		const [fx, fz] = local[0];
		const [lx, lz] = local[local.length - 1];
		if (Math.abs(fx - lx) < 1e-9 && Math.abs(fz - lz) < 1e-9) local.pop();
	}
	return local;
}

/** Approximate centroid of a ring of [x, z] points. */
export function ringCentroid(ring) {
	let sx = 0, sz = 0;
	for (const [x, z] of ring) { sx += x; sz += z; }
	const n = Math.max(ring.length, 1);
	return { x: sx / n, z: sz / n };
}

/** Find the property_bounds feature in a FeatureCollection, or null. */
export function findPropertyBounds(geojson) {
	if (!geojson?.features) return null;
	return geojson.features.find((f) => f?.properties?.kind === 'property_bounds') || null;
}

/** Group features by their kind. Returns Record<kind, Feature[]>. */
export function groupByKind(geojson) {
	const out = {};
	for (const f of geojson?.features || []) {
		const k = f?.properties?.kind || 'building';
		(out[k] = out[k] || []).push(f);
	}
	return out;
}

/**
 * Pick a center anchor for the scene from the property's geo data.
 * Preference order: property_bounds polygon centroid → polygon's first vertex →
 * the property's `latitude` / `longitude` columns → null.
 */
export function pickCenter(property) {
	const geojson = property?.boundary_geojson;
	const bounds = findPropertyBounds(geojson);
	if (bounds?.geometry?.type === 'Polygon') {
		const ring = bounds.geometry.coordinates?.[0] || [];
		if (ring.length) {
			let sx = 0, sy = 0;
			for (const [lng, lat] of ring) { sx += lng; sy += lat; }
			return { lng: sx / ring.length, lat: sy / ring.length };
		}
	}
	if (property?.longitude != null && property?.latitude != null) {
		return { lng: Number(property.longitude), lat: Number(property.latitude) };
	}
	return null;
}

/** Dimensions of the local axis-aligned bounding box around a ring. */
export function ringExtents(ring) {
	if (!ring.length) return { minX: 0, maxX: 0, minZ: 0, maxZ: 0, width: 0, depth: 0 };
	let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
	for (const [x, z] of ring) {
		if (x < minX) minX = x;
		if (x > maxX) maxX = x;
		if (z < minZ) minZ = z;
		if (z > maxZ) maxZ = z;
	}
	return { minX, maxX, minZ, maxZ, width: maxX - minX, depth: maxZ - minZ };
}
