<script>
	import { Search, Plus, Building2, MapPin, Layers, Maximize2, Wallet, Inbox } from 'lucide-svelte';

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
				(p) => p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q)
			);
		}

		return list;
	});

	const statusBadgeClass = (status) => {
		switch (status) {
			case 'available':
				return 'inline-flex rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium capitalize text-success';
			case 'occupied':
				return 'inline-flex rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium capitalize text-primary';
			case 'maintenance':
				return 'inline-flex rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium capitalize text-warning-foreground dark:bg-warning/15 dark:text-warning';
			default:
				return 'inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground';
		}
	};
</script>

<svelte:head>
	<title>Properties — KH Rentals</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="kicker">Properties</p>
			<h1 class="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
				All properties
			</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				{data.properties.length}
				{data.properties.length === 1 ? 'property' : 'properties'}
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<a
				href="/configure/bank-profiles"
				class="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-secondary"
			>
				<Wallet class="h-4 w-4" />
				Bank profiles
			</a>
			<a
				href="/properties/new"
				class="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
			>
				<Plus class="h-4 w-4" />
				Add property
			</a>
		</div>
	</header>

	<!-- Filters -->
	<div class="flex flex-col gap-3 sm:flex-row">
		<div class="relative flex-1">
			<Search
				class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
			/>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by name or address…"
				class="w-full rounded-2xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
			/>
		</div>
		<select
			bind:value={statusFilter}
			class="rounded-2xl border border-input bg-background px-4 py-2.5 text-sm text-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
		>
			<option value="all">All statuses</option>
			<option value="available">Available</option>
			<option value="occupied">Occupied</option>
			<option value="maintenance">Maintenance</option>
		</select>
	</div>

	<!-- Grid -->
	{#if filtered().length > 0}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each filtered() as property}
				<a
					href="/properties/{property.id}"
					class="group rounded-2xl border border-border bg-card p-5 glow-primary transition-all duration-400 ease-smooth hover:-translate-y-1"
				>
					<div class="mb-3 flex items-start justify-between gap-3">
						<div class="flex min-w-0 items-center gap-2">
							<div class="flex-shrink-0 rounded-xl bg-primary p-2 text-primary-foreground">
								<Building2 class="h-4 w-4" />
							</div>
							<h3 class="truncate font-display text-base font-semibold text-foreground group-hover:text-primary">
								{property.name}
							</h3>
						</div>
						<span class={statusBadgeClass(property.status)}>
							{property.status}
						</span>
					</div>

					{#if property.address}
						<div class="mb-3 flex items-start gap-1.5 text-sm text-muted-foreground">
							<MapPin class="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
							<span class="line-clamp-2">{property.address}</span>
						</div>
					{/if}

					<div class="flex items-center gap-4 text-xs text-muted-foreground">
						{#if property.propertytype}
							<span class="capitalize">{property.propertytype}</span>
						{/if}
						<span class="flex items-center gap-1">
							<Layers class="h-3.5 w-3.5" />
							<span class="font-mono">{property.unit_count}</span>
							{property.unit_count === 1 ? 'unit' : 'units'}
						</span>
						{#if property.squarefeet}
							<span class="flex items-center gap-1">
								<Maximize2 class="h-3.5 w-3.5" />
								<span class="font-mono">{Number(property.squarefeet).toLocaleString()}</span> sqft
							</span>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div
			class="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card py-12 text-center"
		>
			<div class="rounded-2xl bg-secondary p-4 text-muted-foreground">
				{#if searchQuery || statusFilter !== 'all'}
					<Inbox class="h-6 w-6" />
				{:else}
					<Building2 class="h-6 w-6" />
				{/if}
			</div>
			<p class="mt-4 font-display text-lg font-semibold">
				{searchQuery || statusFilter !== 'all' ? 'No properties found' : 'No properties yet'}
			</p>
			<p class="mt-1 max-w-sm text-sm text-muted-foreground">
				{#if searchQuery || statusFilter !== 'all'}
					Try adjusting your search or filter.
				{:else}
					Get started by adding your first property.
				{/if}
			</p>
			{#if !searchQuery && statusFilter === 'all'}
				<a
					href="/properties/new"
					class="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
				>
					<Plus class="h-4 w-4" />
					Add property
				</a>
			{/if}
		</div>
	{/if}
</div>
