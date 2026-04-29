<script>
	import { enhance } from '$app/forms';
	import { ArrowLeft, Map } from 'lucide-svelte';

	let { data, form } = $props();

	let submitting = $state(false);

	const property = $derived(data.property);

	const propertyTypes = ['apartment', 'house', 'commercial', 'land', 'condo', 'townhouse', 'other'];
	const statuses = ['available', 'occupied', 'maintenance'];

	const val = (field) => form?.values?.[field] ?? property[field] ?? '';
	const amenitiesValue = $derived(
		form?.values?.amenities ?? (property.amenities?.join(', ') || '')
	);
</script>

<svelte:head>
	<title>Edit {property.name} - KH Rentals</title>
</svelte:head>

<div class="mx-auto max-w-2xl">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between gap-3">
		<div class="flex items-center gap-3">
			<a
				href="/properties/{property.id}"
				class="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
			>
				<ArrowLeft class="h-4 w-4" />
			</a>
			<h1 class="text-2xl font-bold text-slate-900">Edit Property</h1>
		</div>
		<a
			href="/properties/{property.id}/footprint"
			class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
		>
			<Map class="h-4 w-4" />
			Edit footprints
		</a>
	</div>

	{#if form?.error}
		<div class="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
			{form.error}
		</div>
	{/if}

	<form
		method="POST"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}
		class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
	>
		<div class="space-y-5">
			<!-- Name -->
			<div>
				<label for="name" class="block text-sm font-medium text-slate-700">Name <span class="text-red-500">*</span></label>
				<input
					type="text"
					id="name"
					name="name"
					required
					value={val('name')}
					class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
					placeholder="e.g. Sunrise Apartments"
				/>
			</div>

			<!-- Address -->
			<div>
				<label for="address" class="block text-sm font-medium text-slate-700">Address</label>
				<textarea
					id="address"
					name="address"
					rows="2"
					class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
					placeholder="Full property address"
				>{val('address')}</textarea>
			</div>

			<!-- Type & Status -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label for="propertytype" class="block text-sm font-medium text-slate-700">Property Type</label>
					<select
						id="propertytype"
						name="propertytype"
						class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
					>
						<option value="">Select type</option>
						{#each propertyTypes as type}
							<option value={type} selected={val('propertytype') === type}>{type}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="status" class="block text-sm font-medium text-slate-700">Status</label>
					<select
						id="status"
						name="status"
						class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
					>
						{#each statuses as s}
							<option value={s} selected={val('status') === s}>{s}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Description -->
			<div>
				<label for="description" class="block text-sm font-medium text-slate-700">Description</label>
				<textarea
					id="description"
					name="description"
					rows="3"
					class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
					placeholder="Property description"
				>{val('description')}</textarea>
			</div>

			<!-- Sqft & Year -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label for="squarefeet" class="block text-sm font-medium text-slate-700">Square Feet</label>
					<input
						type="number"
						id="squarefeet"
						name="squarefeet"
						step="0.01"
						value={val('squarefeet')}
						class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
						placeholder="e.g. 1200"
					/>
				</div>
				<div>
					<label for="yearbuilt" class="block text-sm font-medium text-slate-700">Year Built</label>
					<input
						type="number"
						id="yearbuilt"
						name="yearbuilt"
						value={val('yearbuilt')}
						class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
						placeholder="e.g. 2020"
					/>
				</div>
			</div>

			<!-- Amenities -->
			<div>
				<label for="amenities" class="block text-sm font-medium text-slate-700">Amenities</label>
				<input
					type="text"
					id="amenities"
					name="amenities"
					value={amenitiesValue}
					class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
					placeholder="e.g. Pool, Gym, Parking (comma-separated)"
				/>
				<p class="mt-1 text-xs text-slate-500">Separate amenities with commas</p>
			</div>

			<!-- Rates -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label for="electricity_rate" class="block text-sm font-medium text-slate-700">Electricity Rate</label>
					<input
						type="number"
						id="electricity_rate"
						name="electricity_rate"
						step="0.01"
						value={val('electricity_rate')}
						class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
						placeholder="Rate per kWh"
					/>
				</div>
				<div>
					<label for="water_rate" class="block text-sm font-medium text-slate-700">Water Rate</label>
					<input
						type="number"
						id="water_rate"
						name="water_rate"
						step="0.01"
						value={val('water_rate')}
						class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
						placeholder="Rate per unit"
					/>
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
			<a
				href="/properties/{property.id}"
				class="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
			>
				Cancel
			</a>
			<button
				type="submit"
				disabled={submitting}
				class="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
			>
				{submitting ? 'Saving...' : 'Save Changes'}
			</button>
		</div>
	</form>
</div>
