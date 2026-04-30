<script>
	import { ArrowLeft, Map } from 'lucide-svelte';
	import PropertyTwin from '$lib/components/PropertyTwin.svelte';

	let { data } = $props();
	const property = $derived(data.property);
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
		<a href="/properties/{property.id}/footprint" class="twin-edit">
			<Map class="h-4 w-4" />
			<span>Edit footprints</span>
		</a>
	</header>

	<div class="twin-canvas">
		<PropertyTwin {property} />
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

	.twin-canvas {
		flex: 1;
		position: relative;
		min-height: 0;
	}
</style>
