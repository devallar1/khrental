<script>
	import { ArrowLeft, Pencil, Building2, MapPin, Calendar, Maximize2, Zap, Droplets, Layers, Hash, Map, Box } from 'lucide-svelte';
	import { formatCurrency, formatMoney } from '$lib/format/money.js';

	let { data } = $props();

	const property = $derived(data.property);
	const units = $derived(data.units);
	const agreements = $derived(data.agreements);

	const statusBadge = (status) => {
		const map = {
			available: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
			occupied: 'bg-blue-50 text-blue-700 ring-blue-600/20',
			maintenance: 'bg-amber-50 text-amber-700 ring-amber-600/20',
			draft: 'bg-slate-50 text-slate-700 ring-slate-600/20',
			active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
			expired: 'bg-red-50 text-red-700 ring-red-600/20',
			terminated: 'bg-red-50 text-red-700 ring-red-600/20'
		};
		return map[status] || 'bg-slate-50 text-slate-700 ring-slate-600/20';
	};

	// Sri Lanka local date format: DD/MM/YYYY.
	const formatDate = (d) => {
		if (!d) return '-';
		const date = new Date(d);
		if (Number.isNaN(date.getTime())) return String(d);
		const dd = String(date.getDate()).padStart(2, '0');
		const mm = String(date.getMonth() + 1).padStart(2, '0');
		return `${dd}/${mm}/${date.getFullYear()}`;
	};

</script>

<svelte:head>
	<title>{property.name} - Properties - KH Rentals</title>
</svelte:head>

<div>
	<!-- Header -->
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex items-center gap-3">
			<a
				href="/properties"
				class="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
			>
				<ArrowLeft class="h-4 w-4" />
			</a>
			<div>
				<h1 class="text-2xl font-bold text-slate-900">{property.name}</h1>
				{#if property.address}
					<p class="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
						<MapPin class="h-3.5 w-3.5" />
						{property.address}
					</p>
				{/if}
			</div>
		</div>
		<div class="flex items-center gap-2">
			<a
				href="/properties/{property.id}/twin"
				class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
			>
				<Box class="h-4 w-4" />
				3D twin
			</a>
			<a
				href="/properties/{property.id}/footprint"
				class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
			>
				<Map class="h-4 w-4" />
				Edit footprints
			</a>
			<a
				href="/properties/{property.id}/edit"
				class="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
			>
				<Pencil class="h-4 w-4" />
				Edit Property
			</a>
		</div>
	</div>

	<!-- Property Details -->
	<div class="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold text-slate-900">Details</h2>
			<span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset {statusBadge(property.status)}">
				{property.status}
			</span>
		</div>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#if property.propertytype}
				<div>
					<p class="text-xs font-medium text-slate-500">Property Type</p>
					<p class="mt-0.5 text-sm font-medium capitalize text-slate-900">{property.propertytype}</p>
				</div>
			{/if}
			{#if property.squarefeet}
				<div>
					<p class="text-xs font-medium text-slate-500">Square Feet</p>
					<p class="mt-0.5 flex items-center gap-1 text-sm font-medium text-slate-900">
						<Maximize2 class="h-3.5 w-3.5 text-slate-400" />
						{Number(property.squarefeet).toLocaleString()}
					</p>
				</div>
			{/if}
			{#if property.yearbuilt}
				<div>
					<p class="text-xs font-medium text-slate-500">Year Built</p>
					<p class="mt-0.5 flex items-center gap-1 text-sm font-medium text-slate-900">
						<Calendar class="h-3.5 w-3.5 text-slate-400" />
						{property.yearbuilt}
					</p>
				</div>
			{/if}
			{#if property.electricity_rate != null}
				<div>
					<p class="text-xs font-medium text-slate-500">Electricity Rate</p>
					<p class="mt-0.5 flex items-center gap-1 text-sm font-medium text-slate-900">
						<Zap class="h-3.5 w-3.5 text-slate-400" />
						{formatCurrency(property.electricity_rate, property.currency)} / kWh
					</p>
				</div>
			{/if}
			{#if property.water_rate != null}
				<div>
					<p class="text-xs font-medium text-slate-500">Water Rate</p>
					<p class="mt-0.5 flex items-center gap-1 text-sm font-medium text-slate-900">
						<Droplets class="h-3.5 w-3.5 text-slate-400" />
						{formatCurrency(property.water_rate, property.currency)} / unit
					</p>
				</div>
			{/if}
			{#if property.availablefrom}
				<div>
					<p class="text-xs font-medium text-slate-500">Available From</p>
					<p class="mt-0.5 text-sm font-medium text-slate-900">{formatDate(property.availablefrom)}</p>
				</div>
			{/if}
		</div>

		{#if property.description}
			<div class="mt-4 border-t border-slate-100 pt-4">
				<p class="text-xs font-medium text-slate-500">Description</p>
				<p class="mt-1 text-sm text-slate-700 whitespace-pre-line">{property.description}</p>
			</div>
		{/if}

		{#if property.amenities?.length}
			<div class="mt-4 border-t border-slate-100 pt-4">
				<p class="text-xs font-medium text-slate-500">Amenities</p>
				<div class="mt-2 flex flex-wrap gap-2">
					{#each property.amenities as amenity}
						<span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">{amenity}</span>
					{/each}
				</div>
			</div>
		{/if}

		{#if property.bank_name || property.bank_branch || property.bank_account_number}
			<div class="mt-4 border-t border-slate-100 pt-4">
				<p class="mb-2 text-xs font-medium text-slate-500">Banking Details</p>
				<div class="grid grid-cols-1 gap-2 sm:grid-cols-3 text-sm">
					{#if property.bank_name}
						<div>
							<span class="text-slate-500">Bank:</span>
							<span class="ml-1 font-medium text-slate-900">{property.bank_name}</span>
						</div>
					{/if}
					{#if property.bank_branch}
						<div>
							<span class="text-slate-500">Branch:</span>
							<span class="ml-1 font-medium text-slate-900">{property.bank_branch}</span>
						</div>
					{/if}
					{#if property.bank_account_number}
						<div>
							<span class="text-slate-500">Account:</span>
							<span class="ml-1 font-medium text-slate-900">{property.bank_account_number}</span>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Units Section -->
	<div class="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="flex items-center gap-2 text-lg font-semibold text-slate-900">
				<Layers class="h-5 w-5 text-slate-400" />
				Units
				<span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{units.length}</span>
			</h2>
		</div>

		{#if units.length > 0}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
							<th class="pb-3 pr-4">Unit</th>
							<th class="pb-3 pr-4">Floor</th>
							<th class="pb-3 pr-4">Beds</th>
							<th class="pb-3 pr-4">Baths</th>
							<th class="pb-3 pr-4">Sqft</th>
							<th class="pb-3">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each units as unit}
							<tr class="border-b border-slate-50">
								<td class="py-3 pr-4 font-medium text-slate-900">{unit.unitnumber}</td>
								<td class="py-3 pr-4 text-slate-600">{unit.floor || '-'}</td>
								<td class="py-3 pr-4 text-slate-600">{unit.bedrooms ?? '-'}</td>
								<td class="py-3 pr-4 text-slate-600">{unit.bathrooms ?? '-'}</td>
								<td class="py-3 pr-4 text-slate-600">{unit.squarefeet ? Number(unit.squarefeet).toLocaleString() : '-'}</td>
								<td class="py-3">
									<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset {statusBadge(unit.status)}">
										{unit.status}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-sm text-slate-500">No units have been added to this property yet.</p>
		{/if}
	</div>

	<!-- Agreements Section -->
	<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="flex items-center gap-2 text-lg font-semibold text-slate-900">
				<Hash class="h-5 w-5 text-slate-400" />
				Agreements
				<span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{agreements.length}</span>
			</h2>
		</div>

		{#if agreements.length > 0}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
							<th class="pb-3 pr-4">Title</th>
							<th class="pb-3 pr-4">Rentee</th>
							<th class="pb-3 pr-4">Unit</th>
							<th class="pb-3 pr-4">Period</th>
							<th class="pb-3 pr-4">Rent</th>
							<th class="pb-3">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each agreements as ag}
							<tr class="border-b border-slate-50">
								<td class="py-3 pr-4">
									<a href="/agreements/{ag.id}" class="font-medium text-slate-900 hover:text-blue-600">
										{ag.title || ag.id.slice(0, 8)}
									</a>
								</td>
								<td class="py-3 pr-4 text-slate-600">{ag.rentee_name || ag.rentee_email || '-'}</td>
								<td class="py-3 pr-4 text-slate-600">{ag.unitnumber || '-'}</td>
								<td class="py-3 pr-4 text-slate-600">
									{formatDate(ag.startdate)} - {formatDate(ag.enddate)}
								</td>
								<td class="py-3 pr-4 text-slate-600">{formatCurrency(ag.rentamount, ag.currency)}</td>
								<td class="py-3">
									<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset {statusBadge(ag.status)}">
										{ag.status}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-sm text-slate-500">No agreements found for this property.</p>
		{/if}
	</div>
</div>
