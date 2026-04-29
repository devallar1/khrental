<script>
	import { onMount, onDestroy } from 'svelte';
	import { PUBLIC_MAPTILER_KEY } from '$env/static/public';

	let { lat, lng, height = 130, hoverParent = '.property-card', boundary = null } = $props();

	let container = $state();
	let map = null;
	let rafId = null;
	let intersectionObserver = null;
	let hoverEl = null;
	let onEnter = null;
	let onLeave = null;
	let visible = false;
	let hovered = false;
	let mapLoaded = false;
	let stateToken = 0;

	// Vector style for the hover/3D view — MapTiler streets-v2-dark has Dark
	// Matter aesthetics AND ships with a 3D building extrusion layer that
	// activates when pitch > 0.
	const STYLE_URL = `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${PUBLIC_MAPTILER_KEY}`;
	// Idle (top-down) satellite — Esri World Imagery is sharper in Sri Lanka
	// than MapTiler's satellite tiles, and keeps the satellite source free.
	const SATELLITE_TILE_URL =
		'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
	const SATELLITE_ATTRIB =
		'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community';
	const HOVER_PITCH = 55;
	const REST_PITCH = 0;
	const TRANSITION_DURATION = 600;

	function startBearingLoop() {
		if (rafId || !map) return;
		const tick = () => {
			if (!map) return;
			if (visible && hovered) {
				const b = map.getBearing();
				map.setBearing((b + 0.18) % 360);
				rafId = requestAnimationFrame(tick);
			} else {
				rafId = null;
			}
		};
		rafId = requestAnimationFrame(tick);
	}

	function stopBearingLoop() {
		if (rafId) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	}

	function applyState() {
		if (!map || !mapLoaded) return;
		const wantPitch = hovered ? HOVER_PITCH : REST_PITCH;
		const wantSatelliteOpacity = hovered ? 0 : 1;

		if (map.getLayer('sat-overlay')) {
			map.setPaintProperty('sat-overlay', 'raster-opacity', wantSatelliteOpacity);
		}

		// Bearing loop calls setBearing every frame, which cancels in-flight eases.
		// Stop it before tilting; restart only after the tilt finishes.
		stopBearingLoop();
		const myToken = ++stateToken;

		if (hovered && visible) {
			map.easeTo({ pitch: wantPitch, duration: TRANSITION_DURATION });
			setTimeout(() => {
				if (myToken === stateToken && hovered && visible) startBearingLoop();
			}, TRANSITION_DURATION + 50);
		} else {
			map.easeTo({ pitch: wantPitch, bearing: 0, duration: TRANSITION_DURATION });
		}
	}

	async function initMap() {
		const maplibregl = (await import('maplibre-gl')).default;
		await import('maplibre-gl/dist/maplibre-gl.css');

		map = new maplibregl.Map({
			container,
			style: STYLE_URL,
			center: [lng, lat],
			zoom: 17.2,
			pitch: REST_PITCH,
			bearing: 0,
			attributionControl: false,
			interactive: false,
			fadeDuration: 0,
			refreshExpiredTiles: false
		});

		map.on('load', () => {
			if (!map) return;
			mapLoaded = true;

			// Esri World Imagery as the idle (top-down) layer. Crossfade its opacity
			// to 0 on hover so the underlying Dark Matter vector style reveals.
			map.addSource('sat-overlay', {
				type: 'raster',
				tiles: [SATELLITE_TILE_URL],
				tileSize: 256,
				attribution: SATELLITE_ATTRIB,
				maxzoom: 19
			});
			map.addLayer({
				id: 'sat-overlay',
				type: 'raster',
				source: 'sat-overlay',
				paint: { 'raster-opacity': 1 }
			});
			map.setPaintProperty('sat-overlay', 'raster-opacity-transition', {
				duration: TRANSITION_DURATION,
				delay: 0
			});

			// Three-layer rendering driven by feature.properties.kind:
			//   property_bounds → line only (yellow perimeter)
			//   building/garage/fence/garden/parking/other → 3D fill-extrusion
			//   unit → flat-ish fill (low extrusion) with bright outline
			if (boundary?.features?.length) {
				map.addSource('prop-boundary', {
					type: 'geojson',
					data: boundary
				});

				const kindColor = [
					'match',
					['coalesce', ['get', 'kind'], 'building'],
					'property_bounds', '#FFD24A',
					'building',        '#4DD8E6',
					'unit',            '#E86FB7',
					'garage',          '#F4B860',
					'fence',           '#7E8B96',
					'garden',          '#6FE890',
					'parking',         '#E8D86F',
					'other',           '#B093E0',
					/* default */      '#4DD8E6'
				];
				const kindHeight = [
					'match',
					['coalesce', ['get', 'kind'], 'building'],
					'building', 8,
					'unit',     1,
					'garage',   4,
					'fence',    1.5,
					'garden',   0.2,
					'parking',  0.2,
					'other',    4,
					/* default */ 4
				];

				// Fill-extrusion for everything except property_bounds
				map.addLayer({
					id: 'prop-boundary-fill',
					type: 'fill-extrusion',
					source: 'prop-boundary',
					filter: ['!=', ['coalesce', ['get', 'kind'], 'building'], 'property_bounds'],
					paint: {
						'fill-extrusion-color': kindColor,
						'fill-extrusion-opacity': 0.55,
						'fill-extrusion-height': kindHeight,
						'fill-extrusion-base': 0
					}
				});

				// Outline for everything (including property_bounds — this is what
				// makes the plot perimeter visible since the fill layer skips it).
				map.addLayer({
					id: 'prop-boundary-outline',
					type: 'line',
					source: 'prop-boundary',
					paint: {
						'line-color': kindColor,
						'line-width': [
							'match',
							['coalesce', ['get', 'kind'], 'building'],
							'property_bounds', 2.2,
							'unit',            1.6,
							/* default */      1.4
						],
						'line-blur': 0.5,
						'line-opacity': 0.95
					}
				});
			}

			// If user hovered before the map finished loading, sync state now.
			if (hovered) applyState();
		});
	}

	onMount(() => {
		hoverEl = (hoverParent && container.closest(hoverParent)) || container;
		onEnter = () => { hovered = true; applyState(); };
		onLeave = () => { hovered = false; applyState(); };
		hoverEl.addEventListener('pointerenter', onEnter);
		hoverEl.addEventListener('pointerleave', onLeave);

		intersectionObserver = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					visible = e.isIntersecting;
					if (visible && !map) initMap();
					else if (!visible) stopBearingLoop();
				}
			},
			{ rootMargin: '200px', threshold: 0.01 }
		);
		intersectionObserver.observe(container);
	});

	onDestroy(() => {
		stopBearingLoop();
		intersectionObserver?.disconnect();
		if (hoverEl && onEnter && onLeave) {
			hoverEl.removeEventListener('pointerenter', onEnter);
			hoverEl.removeEventListener('pointerleave', onLeave);
		}
		if (map) {
			map.remove();
			map = null;
		}
	});
</script>

<div
	bind:this={container}
	class="property-map"
	style="height: {height}px;"
	aria-hidden="true"
></div>

<style>
	.property-map {
		position: relative;
		width: 100%;
		overflow: hidden;
		background: oklch(0.18 0.025 220);
	}
	.property-map :global(.maplibregl-ctrl-attrib),
	.property-map :global(.maplibregl-ctrl-logo) {
		display: none;
	}
</style>
