<script>
	import { Search, Plus, Building2, MapPin, Layers, Maximize2, Wallet } from 'lucide-svelte';

	let { data } = $props();

	let searchQuery = $state('');
	let statusFilter = $state('all');

	const filtered = $derived(() => {
		let list = data.properties;

		if (statusFilter !== 'all') {
			list = list.filter((p) => p.status === statusFilter);
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter(
				(p) =>
					p.name?.toLowerCase().includes(q) ||
					p.address?.toLowerCase().includes(q)
			);
		}

		return list;
	});

	const statusBadge = (status) => {
		const map = {
			available: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
			occupied: 'bg-blue-50 text-blue-700 ring-blue-600/20',
			maintenance: 'bg-amber-50 text-amber-700 ring-amber-600/20'
		};
		return map[status] || 'bg-slate-50 text-slate-700 ring-slate-600/20';
	};
</script>

<svelte:head>
	<title>Properties - KH Rentals</title>
</svelte:head>

<div>
	<!-- Header -->
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">Properties</h1>
			<p class="mt-1 text-sm text-slate-500">{data.properties.length} total properties</p>
		</div>
		<div class="flex items-center gap-2">
			<a
				href="/properties/bank-profiles"
				class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
			>
				<Wallet class="h-4 w-4" />
				Bank profiles
			</a>
			<a
				href="/properties/new"
				class="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
			>
				<Plus class="h-4 w-4" />
				Add Property
			</a>
		</div>
	</div>

	<!-- Filters -->
	<div class="mb-6 flex flex-col gap-3 sm:flex-row">
		<div class="relative flex-1">
			<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by name or address..."
				class="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
			/>
		</div>
		<select
			bind:value={statusFilter}
			class="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
		>
			<option value="all">All Statuses</option>
			<option value="available">Available</option>
			<option value="occupied">Occupied</option>
			<option value="maintenance">Maintenance</option>
		</select>
	</div>

	<!-- Grid -->
	{#if filtered().length > 0}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each filtered() as property}
				<a
					href="/properties/{property.id}"
					class="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-slate-300"
				>
					<div class="mb-3 flex items-start justify-between">
						<div class="flex items-center gap-2">
							<div class="rounded-xl bg-blue-500 p-2 text-white">
								<Building2 class="h-4 w-4" />
							</div>
							<h3 class="font-semibold text-slate-900 group-hover:text-slate-700">
								{property.name}
							</h3>
						</div>
						<span
							class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset {statusBadge(property.status)}"
						>
							{property.status}
						</span>
					</div>

					{#if property.address}
						<div class="mb-3 flex items-start gap-1.5 text-sm text-slate-500">
							<MapPin class="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
							<span class="line-clamp-2">{property.address}</span>
						</div>
					{/if}

					<div class="flex items-center gap-4 text-xs text-slate-500">
						{#if property.propertytype}
							<span class="capitalize">{property.propertytype}</span>
						{/if}
						<span class="flex items-center gap-1">
							<Layers class="h-3.5 w-3.5" />
							{property.unit_count} unit{property.unit_count !== 1 ? 's' : ''}
						</span>
						{#if property.squarefeet}
							<span class="flex items-center gap-1">
								<Maximize2 class="h-3.5 w-3.5" />
								{Number(property.squarefeet).toLocaleString()} sqft
							</span>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="rounded-2xl border border-slate-200 bg-white py-16 text-center">
			<Building2 class="mx-auto h-10 w-10 text-slate-300" />
			<h3 class="mt-3 text-sm font-semibold text-slate-900">No properties found</h3>
			<p class="mt-1 text-sm text-slate-500">
				{#if searchQuery || statusFilter !== 'all'}
					Try adjusting your search or filter.
				{:else}
					Get started by adding your first property.
				{/if}
			</p>
			{#if !searchQuery && statusFilter === 'all'}
				<a
					href="/properties/new"
					class="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
				>
					<Plus class="h-4 w-4" />
					Add Property
				</a>
			{/if}
		</div>
	{/if}
</div>
