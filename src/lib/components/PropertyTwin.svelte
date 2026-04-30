<script>
	import { Canvas, T } from '@threlte/core';
	import { OrbitControls, Grid } from '@threlte/extras';
	import * as THREE from 'three';
	import MapBackdrop from './MapBackdrop.svelte';
	import { TILE_URLS } from '$lib/twin/tileStitch.js';
	import {
		pickCenter,
		findPropertyBounds,
		groupByKind,
		polygonOuterRing,
		ringCentroid,
		ringExtents
	} from '$lib/twin/geo.js';

	// `layers` lets the page toggle visual underlays. Default both off so the
	// scene starts clean — page wires the panel UI and flips these on demand.
	let {
		property,
		layers = { satellite: false, streets: false, terrain: true, grid: true }
	} = $props();

	const center = $derived(pickCenter(property));
	const geojson = $derived(property?.boundary_geojson || { type: 'FeatureCollection', features: [] });
	const grouped = $derived(groupByKind(geojson));

	// Property terrain — a flat plane shaped to the property_bounds polygon.
	// Topology (real elevation) goes here later; for now: flat at y=0.
	// Build a Three.js Shape from a polygon ring of [x, z] tuples in
	// scene-local meters where z is measured *south* of the center. The plane
	// the shape is extruded onto rotates -π/2 around X so its local Y maps to
	// scene -Z (north) — which means we have to negate Y when authoring the
	// shape, otherwise south points end up rendered as north points.
	function buildShape(ring) {
		const shape = new THREE.Shape();
		shape.moveTo(ring[0][0], -ring[0][1]);
		for (let i = 1; i < ring.length; i++) shape.lineTo(ring[i][0], -ring[i][1]);
		shape.closePath();
		return shape;
	}

	const terrainShape = $derived.by(() => {
		const bounds = findPropertyBounds(geojson);
		if (!bounds || !center) return null;
		const ring = polygonOuterRing(bounds.geometry, center);
		if (ring.length < 3) return null;
		return { shape: buildShape(ring), extents: ringExtents(ring) };
	});

	// Each non-bounds polygon becomes a Three.js Shape projected onto the
	// terrain plane. Walls = vertical extrusion. Units sit shorter so they
	// read as floor zones inside their host building.
	function shapeFromFeature(feature) {
		if (!center) return null;
		const ring = polygonOuterRing(feature.geometry, center);
		if (ring.length < 3) return null;
		return buildShape(ring);
	}

	const buildings = $derived.by(() => {
		const list = [];
		for (const kind of ['building', 'garage', 'fence', 'garden', 'parking', 'other']) {
			for (const f of grouped[kind] || []) {
				const shape = shapeFromFeature(f);
				if (!shape) continue;
				list.push({ feature: f, shape, kind });
			}
		}
		return list;
	});

	const units = $derived.by(() => {
		const list = [];
		for (const f of grouped['unit'] || []) {
			const shape = shapeFromFeature(f);
			if (!shape) continue;
			list.push({ feature: f, shape });
		}
		return list;
	});

	// Intangible assets — Point-geometry features. Trees are the headline use
	// case (species, planted date, yield over time live in feature.properties).
	// Other point kinds (lamps, taps, wells) can fall through into a generic
	// marker render path later.
	function pointFromFeature(f) {
		if (!center) return null;
		const g = f.geometry;
		if (!g) return null;
		let lng, lat;
		if (g.type === 'Point' && Array.isArray(g.coordinates)) {
			[lng, lat] = g.coordinates;
		} else if (g.type === 'Polygon') {
			// Allow trees stored as a tiny polygon — use the centroid.
			const ring = polygonOuterRing(g, center);
			if (!ring.length) return null;
			const c = ringCentroid(ring);
			return { x: c.x, z: c.z };
		} else {
			return null;
		}
		const cosLat = Math.cos((center.lat * Math.PI) / 180);
		return {
			x: (lng - center.lng) * 111320 * cosLat,
			z: (center.lat - lat) * 110540
		};
	}

	const trees = $derived.by(() => {
		const list = [];
		for (const f of grouped['tree'] || []) {
			const p = pointFromFeature(f);
			if (!p) continue;
			const props = f.properties || {};
			// Reasonable defaults; species-specific scaling is a later pass.
			const heightM = Number(props.height_m) || 5;
			list.push({
				feature: f,
				x: p.x,
				z: p.z,
				heightM,
				species: props.species || ''
			});
		}
		return list;
	});

	// Camera framing — pull back proportional to the property's larger dimension.
	const camera = $derived.by(() => {
		const ext = terrainShape?.extents;
		const span = Math.max(ext?.width || 50, ext?.depth || 50);
		const dist = Math.max(40, span * 1.4);
		return { position: [dist * 0.7, dist * 0.6, dist * 0.7], target: [0, 0, 0] };
	});

	const KIND_COLOR = {
		building: '#4DD8E6',
		garage:   '#F4B860',
		fence:    '#7E8B96',
		garden:   '#6FE890',
		parking:  '#E8D86F',
		other:    '#B093E0'
	};
	const KIND_HEIGHT = {
		building: 8,
		garage:   3.5,
		fence:    1.4,
		garden:   0.05,
		parking:  0.05,
		other:    3
	};

	const hasBounds = $derived(!!terrainShape);
</script>

<div class="twin-shell">
	{#if !center}
		<div class="twin-empty">
			<p>This property has no coordinates set.</p>
			<a href="/properties/{property.id}/edit">Set lat/lng first</a>
		</div>
	{:else if !hasBounds}
		<div class="twin-empty">
			<p>This property has no property-bounds polygon yet.</p>
			<a href="/properties/{property.id}/footprint">Draw the property bounds</a>
		</div>
	{:else}
		<Canvas>
			<T.PerspectiveCamera makeDefault position={camera.position} fov={55} near={0.5} far={2000}>
				<OrbitControls
					target={camera.target}
					enableDamping
					dampingFactor={0.08}
					maxPolarAngle={Math.PI / 2 - 0.02}
					minDistance={5}
					maxDistance={1000}
				/>
			</T.PerspectiveCamera>

			<T.AmbientLight intensity={0.55} />
			<T.HemisphereLight intensity={0.4} args={[0xb1c8ff, 0x4a3a25, 1]} />
			<T.DirectionalLight
				position={[60, 100, 40]}
				intensity={1.1}
				castShadow
				shadow.mapSize.width={2048}
				shadow.mapSize.height={2048}
				shadow.camera.left={-200}
				shadow.camera.right={200}
				shadow.camera.top={200}
				shadow.camera.bottom={-200}
				shadow.camera.near={1}
				shadow.camera.far={400}
			/>

			<!-- Reference grid; 1 cell = 1 m, helpful while iterating -->
			{#if layers.grid}
				<Grid
					sectionSize={10}
					cellSize={1}
					sectionColor="#3a4a55"
					cellColor="#202830"
					infiniteGrid={false}
					gridSize={[Math.max(terrainShape.extents.width, 50) * 1.5, Math.max(terrainShape.extents.depth, 50) * 1.5]}
					fadeDistance={500}
				/>
			{/if}

			<!-- Toggleable map backdrops. Both fetch raster tiles from Esri
			     (free, no key) and stitch them client-side, so we sidestep
			     MapTiler's Static Maps service permissions entirely. -->
			{#if layers.satellite}
				<MapBackdrop
					extents={terrainShape.extents}
					{center}
					urlTemplate={TILE_URLS['esri-imagery']}
					yOffset={-0.05}
				/>
			{/if}
			{#if layers.streets}
				<MapBackdrop
					extents={terrainShape.extents}
					{center}
					urlTemplate={TILE_URLS['esri-streets']}
					yOffset={-0.04}
				/>
			{/if}

			<!-- Terrain — extruded property bounds. Real heightmaps go here later. -->
			{#if layers.terrain}
				<T.Mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
					<T.ExtrudeGeometry args={[terrainShape.shape, { depth: 0.2, bevelEnabled: false }]} />
					<T.MeshStandardMaterial color="#2a3540" roughness={0.95} metalness={0.0} transparent={layers.satellite || layers.streets} opacity={(layers.satellite || layers.streets) ? 0.45 : 1} />
				</T.Mesh>
			{/if}

			<!-- Buildings + secondary kinds -->
			{#each buildings as b (b.feature.id || b.feature.properties?.name)}
				<T.Group>
					<!-- Floor pad: a slightly raised flat slab the building sits on,
					     gives the "level ground" feeling under each building. -->
					<T.Mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.21, 0]}>
						<T.ExtrudeGeometry args={[b.shape, { depth: 0.15, bevelEnabled: false }]} />
						<T.MeshStandardMaterial color="#3d4a55" roughness={0.85} />
					</T.Mesh>
					<!-- Wall indication: extruded outline above the pad. -->
					<T.Mesh castShadow receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.36, 0]}>
						<T.ExtrudeGeometry args={[b.shape, { depth: KIND_HEIGHT[b.kind] || 4, bevelEnabled: false }]} />
						<T.MeshStandardMaterial
							color={KIND_COLOR[b.kind] || '#4DD8E6'}
							roughness={0.55}
							metalness={0.05}
							transparent
							opacity={0.55}
						/>
					</T.Mesh>
				</T.Group>
			{/each}

			<!-- Unit floors: low slabs inside buildings, distinct color so the
			     interior partition reads at a glance. -->
			{#each units as u (u.feature.id || u.feature.properties?.name)}
				<T.Mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.4, 0]}>
					<T.ExtrudeGeometry args={[u.shape, { depth: 0.12, bevelEnabled: false }]} />
					<T.MeshStandardMaterial color="#E86FB7" roughness={0.6} metalness={0.05} />
				</T.Mesh>
			{/each}

			<!-- Trees + other point assets. Trunk + canopy primitives for now;
			     species-aware geometry / GLTF models are a later swap. -->
			{#each trees as t (t.feature.id || `${t.x},${t.z}`)}
				{@const trunkH = Math.max(t.heightM * 0.35, 1.2)}
				{@const canopyH = Math.max(t.heightM - trunkH, 1.5)}
				{@const canopyR = Math.max(t.heightM * 0.35, 0.8)}
				<T.Group position={[t.x, 0.2, t.z]}>
					<T.Mesh castShadow position={[0, trunkH / 2, 0]}>
						<T.CylinderGeometry args={[0.15, 0.22, trunkH, 8]} />
						<T.MeshStandardMaterial color="#6b4a2b" roughness={0.9} />
					</T.Mesh>
					<T.Mesh castShadow position={[0, trunkH + canopyH / 2, 0]}>
						<T.SphereGeometry args={[canopyR, 12, 10]} />
						<T.MeshStandardMaterial color="#4a8c3f" roughness={0.85} />
					</T.Mesh>
				</T.Group>
			{/each}
		</Canvas>

		<!-- HUD: tiny stats + legend, overlaid -->
		<div class="twin-hud">
			<div class="hud-row">
				<strong>{property.name}</strong>
				<span class="hud-meta">{Math.round(terrainShape.extents.width)} × {Math.round(terrainShape.extents.depth)} m</span>
			</div>
			<div class="hud-legend">
				{#each Object.keys(KIND_COLOR) as k}
					{#if (grouped[k] || []).length}
						<span class="legend-chip">
							<span class="swatch" style="background: {KIND_COLOR[k]};"></span>{k}
						</span>
					{/if}
				{/each}
				{#if (grouped.unit || []).length}
					<span class="legend-chip"><span class="swatch" style="background: #E86FB7;"></span>unit</span>
				{/if}
				{#if (grouped.tree || []).length}
					<span class="legend-chip"><span class="swatch" style="background: #4a8c3f;"></span>tree ({grouped.tree.length})</span>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.twin-shell {
		position: relative;
		width: 100%;
		height: 100%;
		background: #0e1620;
	}
	.twin-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 12px;
		color: #cbd5e1;
		font-size: 14px;
	}
	.twin-empty a {
		display: inline-block;
		padding: 8px 14px;
		background: #4DD8E6;
		color: #0e1620;
		border-radius: 8px;
		text-decoration: none;
		font-weight: 600;
	}

	.twin-hud {
		position: absolute;
		top: 14px;
		left: 14px;
		padding: 10px 14px;
		background: rgba(15, 22, 32, 0.85);
		backdrop-filter: blur(6px);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 10px;
		color: #cbd5e1;
		font-size: 12px;
		pointer-events: none;
	}
	.hud-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.hud-row strong {
		color: #4DD8E6;
		font-size: 13px;
	}
	.hud-meta {
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		color: #94a3b8;
	}
	.hud-legend {
		margin-top: 6px;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.legend-chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 11px;
		color: #cbd5e1;
		text-transform: capitalize;
	}
	.swatch {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 2px;
	}
</style>
