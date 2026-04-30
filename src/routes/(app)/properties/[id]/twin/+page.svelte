<script>
	import { ArrowLeft, Map, Layers, Check } from 'lucide-svelte';
	import PropertyTwin from '$lib/components/PropertyTwin.svelte';

	let { data } = $props();
	const property = $derived(data.property);

	// Layer toggles for the threlte scene. Sat/streets default off — they
	// hit MapTiler so we don't fetch a tile until the user asks.
	let layers = $state({
		satellite: false,
		streets: false,
		terrain: true,
		grid: true
	});
	let layersOpen = $state(false);

	function toggle(key) {
		layers = { ...layers, [key]: !layers[key] };
	}

	const LAYER_ROWS = [
		{ key: 'satellite', name: 'Satellite imagery', source: 'Esri' },
		{ key: 'streets',   name: 'Streets & labels',  source: 'Esri' },
		{ key: 'terrain',   name: 'Terrain slab',      source: 'local' },
		{ key: 'grid',      name: 'Reference grid',    source: 'local' }
	];
</script>

<svelte:head>
	<title>{property.name} · 3D twin — KH Rentals</title>
</svelte:head>

<div class="twin-page">
	<header class="twin-bar">
		<a href="/properties/{property.id}" class="twin-back" aria-label="Back to property">
			<ArrowLeft class="h-4 w-4" />
		</a>
		<div class="twin-title">
			<span class="twin-pill">3D twin</span>
			<h1>{property.name}</h1>
		</div>
		<button
			type="button"
			class="twin-edit"
			class:active={layersOpen}
			onclick={() => (layersOpen = !layersOpen)}
			title="Toggle scene layers"
			aria-haspopup="menu"
			aria-expanded={layersOpen}
		>
			<Layers class="h-4 w-4" />
			<span>Layers</span>
		</button>
		<a href="/properties/{property.id}/footprint" class="twin-edit">
			<Map class="h-4 w-4" />
			<span>Edit footprints</span>
		</a>
	</header>

	{#if layersOpen}
		<div class="twin-layers" role="menu" aria-label="Scene layers">
			<div class="twin-layers-title">Scene</div>
			{#each LAYER_ROWS as row}
				<button
					type="button"
					class="layer-row"
					class:on={layers[row.key]}
					onclick={() => toggle(row.key)}
					role="menuitemcheckbox"
					aria-checked={layers[row.key]}
				>
					<span class="layer-check">{#if layers[row.key]}<Check class="h-3 w-3" />{/if}</span>
					<span class="layer-name">{row.name}</span>
					<span class="layer-source">{row.source}</span>
				</button>
			{/each}
			<div class="twin-layers-hint">
				Tiles stream from Esri's free imagery service the first time you toggle
				a layer on. Cached after that.
			</div>
		</div>
	{/if}

	<div class="twin-canvas">
		<PropertyTwin {property} {layers} />
	</div>
</div>

<style>
	.twin-page {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		background: #0e1620;
		color: #e2e8f0;
		z-index: 50;
	}
	.twin-bar {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 14px;
		background: rgba(15, 22, 32, 0.85);
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(6px);
		z-index: 5;
	}
	.twin-back {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: transparent;
		color: #cbd5e1;
		text-decoration: none;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
	.twin-back:hover {
		background: rgba(255, 255, 255, 0.06);
		color: #fff;
	}
	.twin-title {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.twin-title h1 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
	}
	.twin-pill {
		display: inline-block;
		padding: 2px 8px;
		background: rgba(77, 216, 230, 0.15);
		color: #4DD8E6;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		border-radius: 4px;
	}
	.twin-edit {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: transparent;
		color: #cbd5e1;
		text-decoration: none;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 8px;
		font-size: 12px;
		font-weight: 500;
	}
	.twin-edit:hover {
		background: rgba(255, 255, 255, 0.06);
		color: #fff;
	}
	.twin-edit.active {
		background: rgba(77, 216, 230, 0.15);
		color: #4DD8E6;
		border-color: rgba(77, 216, 230, 0.4);
	}

	.twin-canvas {
		flex: 1;
		position: relative;
		min-height: 0;
	}

	/* Layers popover — top-right under the header bar. */
	.twin-layers {
		position: absolute;
		top: 60px;
		right: 14px;
		z-index: 12;
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 10px;
		background: rgba(15, 22, 32, 0.96);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		min-width: 240px;
		box-shadow: 0 12px 32px -10px rgba(0, 0, 0, 0.6);
	}
	.twin-layers-title {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #94a3b8;
		padding: 2px 6px 6px;
	}
	.twin-layers-hint {
		margin-top: 6px;
		padding: 6px 8px 0;
		font-size: 10.5px;
		color: #64748b;
		border-top: 1px dashed rgba(255, 255, 255, 0.08);
	}
	.layer-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		background: transparent;
		color: #cbd5e1;
		border: 1px solid transparent;
		border-radius: 8px;
		cursor: pointer;
		text-align: left;
		font-size: 13px;
	}
	.layer-row:hover {
		background: rgba(255, 255, 255, 0.06);
		color: white;
	}
	.layer-row.on {
		background: rgba(77, 216, 230, 0.10);
		color: #4DD8E6;
		border-color: rgba(77, 216, 230, 0.3);
	}
	.layer-check {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(0, 0, 0, 0.25);
		color: #4DD8E6;
		flex-shrink: 0;
	}
	.layer-row.on .layer-check {
		background: #4DD8E6;
		color: #0b1220;
		border-color: #4DD8E6;
	}
	.layer-name {
		flex: 1;
		font-weight: 500;
	}
	.layer-source {
		font-size: 10px;
		color: #64748b;
		font-family: 'JetBrains Mono', ui-monospace, monospace;
	}
</style>
