<script>
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import PropertyBoundaryEditor from '$lib/components/PropertyBoundaryEditor.svelte';

	let { data, form } = $props();
	const property = $derived(data.property);
	const hasCoords = $derived(
		property?.latitude != null && property?.longitude != null
	);

	let formEl = $state();
	let geojsonField = $state('');
	let submitting = $state(false);

	function handleSave(geojson) {
		geojsonField = JSON.stringify(geojson);
		submitting = true;
		// Defer until reactivity flushes the input value
		queueMicrotask(() => formEl?.requestSubmit?.());
	}

	function handleCancel() {
		goto(`/properties/${property.id}`);
	}
</script>

<svelte:head>
	<title>Edit footprints — {property.name} · KH Rentals</title>
</svelte:head>

{#if !hasCoords}
	<div class="missing-coords">
		<div class="missing-card">
			<h1>No coordinates set for this property.</h1>
			<p>Set <code>latitude</code> / <code>longitude</code> first so we know where to drop the satellite view.</p>
			<div class="missing-actions">
				<a href="/properties/{property.id}/edit" class="primary">Edit property</a>
				<a href="/properties/{property.id}" class="secondary">Back</a>
			</div>
		</div>
	</div>
{:else}
	<div class="footprint-shell">
		{#if form?.error}
			<div class="save-error">{form.error}</div>
		{/if}

		<PropertyBoundaryEditor
			lat={Number(property.latitude)}
			lng={Number(property.longitude)}
			initial={property.boundary_geojson}
			units={data.units || []}
			onSave={handleSave}
			onCancel={handleCancel}
		/>

		<form
			bind:this={formEl}
			method="POST"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					submitting = false;
					await update();
				};
			}}
		>
			<input type="hidden" name="boundary_geojson" value={geojsonField} />
		</form>

		{#if submitting}
			<div class="saving-overlay">Saving footprints…</div>
		{/if}
	</div>
{/if}

<style>
	.footprint-shell {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: #000;
	}
	.save-error {
		position: absolute;
		top: 16px;
		left: 50%;
		transform: translateX(-50%);
		padding: 10px 14px;
		background: rgba(220, 50, 60, 0.92);
		color: white;
		border-radius: 8px;
		font-size: 13px;
		z-index: 30;
	}
	.saving-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.55);
		color: white;
		font-size: 16px;
		font-weight: 600;
		z-index: 40;
	}

	.missing-coords {
		min-height: calc(100vh - 60px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}
	.missing-card {
		max-width: 480px;
		padding: 28px;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 16px;
		box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.08);
	}
	.missing-card h1 {
		font-size: 20px;
		font-weight: 700;
		color: #0f172a;
		margin: 0 0 8px;
	}
	.missing-card p {
		color: #475569;
		font-size: 14px;
		margin: 0 0 20px;
		line-height: 1.5;
	}
	.missing-card code {
		background: #f1f5f9;
		padding: 1px 5px;
		border-radius: 4px;
		font-size: 12px;
	}
	.missing-actions {
		display: flex;
		gap: 10px;
	}
	.missing-actions a {
		display: inline-flex;
		align-items: center;
		padding: 9px 14px;
		border-radius: 10px;
		font-size: 13px;
		font-weight: 600;
		text-decoration: none;
		transition: background 100ms ease;
	}
	.missing-actions .primary {
		background: #0f172a;
		color: white;
	}
	.missing-actions .primary:hover {
		background: #1e293b;
	}
	.missing-actions .secondary {
		background: #f1f5f9;
		color: #334155;
	}
	.missing-actions .secondary:hover {
		background: #e2e8f0;
	}
</style>
