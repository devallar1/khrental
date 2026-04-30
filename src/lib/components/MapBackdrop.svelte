<script>
	import { T } from '@threlte/core';
	import * as THREE from 'three';
	import { stitchTiles, pickZoom } from '$lib/twin/tileStitch.js';

	let {
		extents,
		center,
		urlTemplate,
		yOffset = 0,
		marginRatio = 0.45
	} = $props();

	// extents:    { minX, maxX, minZ, maxZ, width, depth } in local meters
	// center:     { lng, lat }
	// urlTemplate: '{z}/{x}/{y}' tile URL — free Esri layers by default
	// yOffset:    vertical lift so multiple backdrops don't z-fight

	let texture = $state(null);
	let plane = $state(null);

	$effect(() => {
		if (!extents || !center || !urlTemplate || extents.width <= 0 || extents.depth <= 0) return;
		let cancelled = false;

		// Pad the camera the polygon for context — neighbouring buildings,
		// streets etc.
		const margin = Math.max(20, Math.max(extents.width, extents.depth) * marginRatio);
		const minX = extents.minX - margin;
		const maxX = extents.maxX + margin;
		const minZ = extents.minZ - margin;
		const maxZ = extents.maxZ + margin;

		// Local-meter bounds → lat/lng. North = -Z so maxZ = southern edge.
		const cosLat = Math.cos((center.lat * Math.PI) / 180);
		const reqMinLng = center.lng + minX / (111320 * cosLat);
		const reqMaxLng = center.lng + maxX / (111320 * cosLat);
		const reqMinLat = center.lat - maxZ / 110540;
		const reqMaxLat = center.lat - minZ / 110540;

		const span = Math.max(maxX - minX, maxZ - minZ);
		const zoom = pickZoom(span, center.lat);

		stitchTiles({
			minLng: reqMinLng,
			minLat: reqMinLat,
			maxLng: reqMaxLng,
			maxLat: reqMaxLat,
			urlTemplate,
			zoom
		})
			.then(({ canvas, bounds }) => {
				if (cancelled) return;
				// Re-project the tile-aligned bounds back into local-meter coords
				// so the plane sits at exactly the right place under the scene.
				const planeMinX = (bounds.minLng - center.lng) * 111320 * cosLat;
				const planeMaxX = (bounds.maxLng - center.lng) * 111320 * cosLat;
				const planeMinZ = -(bounds.maxLat - center.lat) * 110540;
				const planeMaxZ = -(bounds.minLat - center.lat) * 110540;

				const tex = new THREE.CanvasTexture(canvas);
				tex.colorSpace = THREE.SRGBColorSpace;
				tex.anisotropy = 8;
				tex.needsUpdate = true;
				texture = tex;
				plane = {
					cx: (planeMinX + planeMaxX) / 2,
					cz: (planeMinZ + planeMaxZ) / 2,
					width: planeMaxX - planeMinX,
					depth: planeMaxZ - planeMinZ
				};
			})
			.catch((err) => {
				console.error('[MapBackdrop] stitch failed', err);
				texture = null;
				plane = null;
			});

		return () => {
			cancelled = true;
		};
	});
</script>

{#if texture && plane}
	<T.Mesh
		rotation={[-Math.PI / 2, 0, 0]}
		position={[plane.cx, yOffset, plane.cz]}
		receiveShadow
	>
		<T.PlaneGeometry args={[plane.width, plane.depth]} />
		<T.MeshStandardMaterial map={texture} roughness={0.95} metalness={0.0} />
	</T.Mesh>
{/if}
