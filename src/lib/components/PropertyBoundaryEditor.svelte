<script>
	import { onMount, onDestroy } from 'svelte';
	import { PUBLIC_MAPTILER_KEY } from '$env/static/public';
	import { Square, Hexagon, MousePointer2, Trash2, Save, X } from 'lucide-svelte';

	let { lat, lng, initial = null, units = [], onSave, onCancel } = $props();

	let container = $state();
	let map = null;
	let draw = null;
	let mode = $state('select');
	let selectedId = $state(null);
	let selectedProps = $state({ name: '', kind: 'building', unit_id: '' });
	let initError = $state(null);

	const SATELLITE_TILE_URL =
		'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
	const STYLE_URL = `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${PUBLIC_MAPTILER_KEY}`;

	const KINDS = [
		{ value: 'property_bounds', label: 'Property bounds', color: '#FFD24A' },
		{ value: 'building',        label: 'Building',        color: '#4DD8E6' },
		{ value: 'unit',            label: 'Unit',            color: '#E86FB7' },
		{ value: 'garage',          label: 'Garage',          color: '#F4B860' },
		{ value: 'fence',           label: 'Fence',           color: '#7E8B96' },
		{ value: 'garden',          label: 'Garden',          color: '#6FE890' },
		{ value: 'parking',         label: 'Parking',         color: '#E8D86F' },
		{ value: 'other',           label: 'Other',           color: '#B093E0' }
	];

	async function init() {
		try {
			const maplibregl = (await import('maplibre-gl')).default;
			await import('maplibre-gl/dist/maplibre-gl.css');
			const tdMod = await import('terra-draw');
			const adapterMod = await import('terra-draw-maplibre-gl-adapter');

			map = new maplibregl.Map({
				container,
				style: STYLE_URL,
				center: [lng, lat],
				zoom: 18,
				pitch: 0,
				bearing: 0,
				attributionControl: false,
				interactive: true
			});

			await new Promise((resolve) => map.on('load', resolve));

			// Esri satellite as the visual base for tracing
			map.addSource('sat', {
				type: 'raster',
				tiles: [SATELLITE_TILE_URL],
				tileSize: 256,
				maxzoom: 19,
				attribution: 'Esri / Maxar'
			});
			// Insert sat under the streets-v2-dark vector layers but above any
			// background layer, so the satellite is what the user traces on.
			map.addLayer({ id: 'sat', type: 'raster', source: 'sat' });

			// Bring satellite to the bottom so vector road outlines / labels
			// stay visible above it for orientation. Then mute the vector
			// background so the satellite shows through instead of dark fill.
			const layers = map.getStyle().layers || [];
			const firstSymbolId = layers.find((l) => l.type !== 'background')?.id;
			if (firstSymbolId && firstSymbolId !== 'sat') {
				map.moveLayer('sat', firstSymbolId);
			}
			// Hide the dark background so satellite shows
			if (map.getLayer('background')) {
				map.setPaintProperty('background', 'background-opacity', 0);
			}
			// Soften land/landuse fills so they don't tint the satellite too much
			for (const l of layers) {
				if (l.type === 'fill' && /^(land|landuse|landcover|water)/i.test(l['source-layer'] || l.id)) {
					try { map.setPaintProperty(l.id, 'fill-opacity', 0.0); } catch {}
				}
			}

			const Adapter = adapterMod.TerraDrawMapLibreGLAdapter;
			draw = new tdMod.TerraDraw({
				adapter: new Adapter({ map }),
				modes: [
					new tdMod.TerraDrawPolygonMode(),
					new tdMod.TerraDrawRectangleMode(),
					new tdMod.TerraDrawSelectMode({
						flags: {
							polygon: {
								feature: {
									draggable: true,
									coordinates: {
										midpoints: true,
										draggable: true,
										deletable: true
									}
								}
							},
							rectangle: {
								feature: {
									draggable: true,
									coordinates: {
										midpoints: true,
										draggable: true,
										deletable: true
									}
								}
							}
						}
					})
				]
			});

			draw.start();
			draw.setMode('select');

			if (initial?.features?.length) {
				draw.addFeatures(initial.features);
			}

			draw.on('select', (id) => {
				selectedId = id;
				const f = draw.getSnapshot().find((x) => x.id === id);
				selectedProps = {
					name: f?.properties?.name ?? '',
					kind: f?.properties?.kind || 'building',
					unit_id: f?.properties?.unit_id || ''
				};
			});
			draw.on('deselect', () => {
				selectedId = null;
			});
		} catch (e) {
			console.error('[PropertyBoundaryEditor] init failed', e);
			initError = e?.message || String(e);
		}
	}

	function setMode(m) {
		mode = m;
		if (draw) draw.setMode(m);
	}

	function updateSelected(field, value) {
		if (!selectedId || !draw) return;
		const next = { ...selectedProps, [field]: value };
		selectedProps = next;
		try {
			draw.updateFeatureProperties?.(selectedId, { ...next });
		} catch {
			// Older API: fetch + replace
			const snap = draw.getSnapshot();
			const f = snap.find((x) => x.id === selectedId);
			if (f) {
				draw.removeFeatures([selectedId]);
				draw.addFeatures([{ ...f, properties: { ...f.properties, ...next } }]);
			}
		}
	}

	function deleteSelected() {
		if (!selectedId || !draw) return;
		draw.removeFeatures([selectedId]);
		selectedId = null;
	}

	function handleSave() {
		if (!draw) return;
		const features = (draw.getSnapshot() || []).map((f) => {
			const p = f.properties || {};
			const out = {
				name: p.name ?? '',
				kind: p.kind || 'building'
			};
			if (out.kind === 'unit' && p.unit_id) out.unit_id = p.unit_id;
			return { ...f, properties: out };
		});
		onSave?.({ type: 'FeatureCollection', features });
	}

	onMount(init);

	onDestroy(() => {
		try { draw?.stop?.(); } catch {}
		draw = null;
		try { map?.remove?.(); } catch {}
		map = null;
	});
</script>

<div class="editor-shell">
	<div bind:this={container} class="editor-map"></div>

	{#if initError}
		<div class="editor-error">Map failed to load: {initError}</div>
	{/if}

	<div class="editor-toolbar">
		<button
			type="button"
			class="tool"
			class:active={mode === 'select'}
			onclick={() => setMode('select')}
			title="Select / edit existing"
		>
			<MousePointer2 class="h-4 w-4" />
			<span>Select</span>
		</button>
		<button
			type="button"
			class="tool"
			class:active={mode === 'rectangle'}
			onclick={() => setMode('rectangle')}
			title="Draw rectangle (drag to size)"
		>
			<Square class="h-4 w-4" />
			<span>Rectangle</span>
		</button>
		<button
			type="button"
			class="tool"
			class:active={mode === 'polygon'}
			onclick={() => setMode('polygon')}
			title="Draw polygon (click vertices, double-click to close)"
		>
			<Hexagon class="h-4 w-4" />
			<span>Polygon</span>
		</button>
		<div class="tool-spacer"></div>
		<button
			type="button"
			class="tool danger"
			disabled={!selectedId}
			onclick={deleteSelected}
			title="Delete selected polygon"
		>
			<Trash2 class="h-4 w-4" />
			<span>Delete</span>
		</button>
	</div>

	{#if selectedId}
		<div class="editor-props" role="group" aria-label="Polygon properties">
			<label class="prop-field">
				<span class="prop-label">Kind</span>
				<select
					value={selectedProps.kind}
					onchange={(e) => updateSelected('kind', e.currentTarget.value)}
				>
					{#each KINDS as k}
						<option value={k.value}>{k.label}</option>
					{/each}
				</select>
			</label>
			<label class="prop-field">
				<span class="prop-label">Name</span>
				<input
					type="text"
					value={selectedProps.name}
					oninput={(e) => updateSelected('name', e.currentTarget.value)}
					placeholder={selectedProps.kind === 'property_bounds' ? 'e.g. Plot perimeter' : 'e.g. Main building'}
				/>
			</label>
			{#if selectedProps.kind === 'unit'}
				<label class="prop-field">
					<span class="prop-label">Assigned to unit</span>
					<select
						value={selectedProps.unit_id}
						onchange={(e) => updateSelected('unit_id', e.currentTarget.value)}
					>
						<option value="">— unassigned —</option>
						{#each units as u}
							<option value={u.id}>{u.unitnumber}{u.status ? ` · ${u.status}` : ''}</option>
						{/each}
					</select>
				</label>
			{/if}
		</div>
	{/if}

	<div class="editor-actions">
		<button type="button" class="action cancel" onclick={() => onCancel?.()}>
			<X class="h-4 w-4" /> Cancel
		</button>
		<button type="button" class="action save" onclick={handleSave}>
			<Save class="h-4 w-4" /> Save
		</button>
	</div>
</div>

<style>
	.editor-shell {
		position: relative;
		width: 100%;
		height: 100%;
		background: #000;
	}
	.editor-map {
		position: absolute;
		inset: 0;
	}
	.editor-error {
		position: absolute;
		top: 16px;
		left: 50%;
		transform: translateX(-50%);
		padding: 10px 14px;
		background: rgba(220, 50, 60, 0.9);
		color: white;
		border-radius: 8px;
		z-index: 30;
		font-size: 13px;
	}

	/* Toolbar — top-left floating */
	.editor-toolbar {
		position: absolute;
		top: 16px;
		left: 16px;
		display: flex;
		gap: 6px;
		padding: 6px;
		background: rgba(15, 20, 30, 0.92);
		backdrop-filter: blur(6px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		z-index: 20;
	}
	.tool {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		background: transparent;
		color: #cbd5e1;
		border: 1px solid transparent;
		border-radius: 8px;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: background 100ms ease, color 100ms ease, border-color 100ms ease;
	}
	.tool:hover {
		background: rgba(255, 255, 255, 0.06);
		color: white;
	}
	.tool.active {
		background: rgba(77, 216, 230, 0.15);
		color: #4DD8E6;
		border-color: rgba(77, 216, 230, 0.4);
	}
	.tool.danger:not(:disabled):hover {
		background: rgba(232, 111, 130, 0.18);
		color: #ff8aa3;
	}
	.tool:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.tool-spacer {
		width: 1px;
		background: rgba(255, 255, 255, 0.1);
		margin: 4px 4px;
	}

	/* Property editor — top-right floating */
	.editor-props {
		position: absolute;
		top: 16px;
		right: 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px;
		background: rgba(15, 20, 30, 0.92);
		backdrop-filter: blur(6px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		z-index: 20;
		min-width: 220px;
	}
	.prop-field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.prop-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #94a3b8;
	}
	.prop-field input,
	.prop-field select {
		padding: 7px 10px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 8px;
		color: white;
		font-size: 13px;
		outline: none;
	}
	.prop-field input:focus,
	.prop-field select:focus {
		border-color: rgba(77, 216, 230, 0.6);
	}

	/* Save / Cancel — bottom-right floating */
	.editor-actions {
		position: absolute;
		bottom: 16px;
		right: 16px;
		display: flex;
		gap: 10px;
		z-index: 20;
	}
	.action {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 10px 16px;
		border-radius: 10px;
		font-size: 14px;
		font-weight: 600;
		border: 1px solid transparent;
		cursor: pointer;
		transition: background 100ms ease, transform 80ms ease;
	}
	.action.cancel {
		background: rgba(15, 20, 30, 0.92);
		border-color: rgba(255, 255, 255, 0.12);
		color: #cbd5e1;
	}
	.action.cancel:hover {
		background: rgba(30, 41, 59, 0.95);
	}
	.action.save {
		background: #4DD8E6;
		color: #0b1220;
		box-shadow: 0 6px 18px -6px rgba(77, 216, 230, 0.55);
	}
	.action.save:hover {
		transform: translateY(-1px);
	}
</style>
