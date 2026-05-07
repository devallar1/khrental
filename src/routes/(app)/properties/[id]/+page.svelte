<script>
	import {
		ArrowLeft,
		Pencil,
		MapPin,
		Calendar,
		Maximize2,
		Zap,
		Droplets,
		Layers,
		Hash,
		Map,
		Box
	} from 'lucide-svelte';
	import { formatCurrency } from '$lib/format/money.js';

	let { data } = $props();

	const property = $derived(data.property);
	const units = $derived(data.units);
	const agreements = $derived(data.agreements);

	const statusBadgeClass = (status) => {
		switch (status) {
			case 'available':
			case 'active':
				return 'inline-flex items-center rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium capitalize text-success';
			case 'occupied':
				return 'inline-flex items-center rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium capitalize text-primary';
			case 'maintenance':
				return 'inline-flex items-center rounded-full bg-warning/20 px-2.5 py-1 text-xs font-medium capitalize text-warning-foreground dark:bg-warning/15 dark:text-warning';
			case 'expired':
			case 'terminated':
				return 'inline-flex items-center rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium capitalize text-destructive';
			default:
				return 'inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground';
		}
	};

	// Sri Lanka local date format: DD/MM/YYYY.
	const formatDate = (d) => {
		if (!d) return '—';
		const date = new Date(d);
		if (Number.isNaN(date.getTime())) return String(d);
		const dd = String(date.getDate()).padStart(2, '0');
		const mm = String(date.getMonth() + 1).padStart(2, '0');
		return `${dd}/${mm}/${date.getFullYear()}`;
	};
</script>

<svelte:head>
	<title>{property.name} — Properties — KH Rentals</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div class="flex items-start gap-3">
			<a
				href="/properties"
				class="rounded-2xl border border-border bg-card p-2.5 text-muted-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:text-foreground"
				aria-label="Back to properties"
			>
				<ArrowLeft class="h-4 w-4" />
			</a>
			<div>
				<p class="kicker">Property</p>
				<h1 class="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
					{property.name}
				</h1>
				{#if property.address}
					<p class="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
						<MapPin class="h-3 w-3" />
						{property.address}
					</p>
				{/if}
			</div>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<a
				href="/properties/{property.id}/twin"
				class="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-secondary"
			>
				<Box class="h-4 w-4" />
				3D twin
			</a>
			<a
				href="/properties/{property.id}/footprint"
				class="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-secondary"
			>
				<Map class="h-4 w-4" />
				Footprints
			</a>
			<a
				href="/properties/{property.id}/edit"
				class="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
			>
				<Pencil class="h-4 w-4" />
				Edit
			</a>
		</div>
	</header>

	<!-- Property details -->
	<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="font-display text-base font-semibold">Details</h2>
			<span class={statusBadgeClass(property.status)}>
				{property.status}
			</span>
		</div>

		<dl class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#if property.propertytype}
				<div>
					<dt class="kicker mb-1">Type</dt>
					<dd class="text-sm font-medium capitalize">{property.propertytype}</dd>
				</div>
			{/if}
			{#if property.squarefeet}
				<div>
					<dt class="kicker mb-1 flex items-center gap-1.5">
						<Maximize2 class="h-3 w-3" /> Square feet
					</dt>
					<dd class="font-mono text-sm font-medium">
						{Number(property.squarefeet).toLocaleString()}
					</dd>
				</div>
			{/if}
			{#if property.yearbuilt}
				<div>
					<dt class="kicker mb-1 flex items-center gap-1.5">
						<Calendar class="h-3 w-3" /> Year built
					</dt>
					<dd class="font-mono text-sm font-medium">{property.yearbuilt}</dd>
				</div>
			{/if}
			{#if property.electricity_rate != null}
				<div>
					<dt class="kicker mb-1 flex items-center gap-1.5">
						<Zap class="h-3 w-3" /> Electricity
					</dt>
					<dd class="font-mono text-sm font-medium">
						{formatCurrency(property.electricity_rate, property.currency)} / kWh
					</dd>
				</div>
			{/if}
			{#if property.water_rate != null}
				<div>
					<dt class="kicker mb-1 flex items-center gap-1.5">
						<Droplets class="h-3 w-3" /> Water
					</dt>
					<dd class="font-mono text-sm font-medium">
						{formatCurrency(property.water_rate, property.currency)} / unit
					</dd>
				</div>
			{/if}
			{#if property.availablefrom}
				<div>
					<dt class="kicker mb-1">Available from</dt>
					<dd class="text-sm font-medium">{formatDate(property.availablefrom)}</dd>
				</div>
			{/if}
		</dl>

		{#if property.description}
			<div class="mt-4 border-t border-border pt-4">
				<p class="kicker mb-1">Description</p>
				<p class="whitespace-pre-line text-sm">{property.description}</p>
			</div>
		{/if}

		{#if property.amenities?.length}
			<div class="mt-4 border-t border-border pt-4">
				<p class="kicker mb-2">Amenities</p>
				<div class="flex flex-wrap gap-2">
					{#each property.amenities as amenity}
						<span class="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
							{amenity}
						</span>
					{/each}
				</div>
			</div>
		{/if}

		{#if property.bank_name || property.bank_branch || property.bank_account_number}
			<div class="mt-4 border-t border-border pt-4">
				<p class="kicker mb-2">Banking</p>
				<dl class="grid gap-2 text-sm sm:grid-cols-3">
					{#if property.bank_name}
						<div>
							<dt class="text-muted-foreground">Bank</dt>
							<dd class="font-medium">{property.bank_name}</dd>
						</div>
					{/if}
					{#if property.bank_branch}
						<div>
							<dt class="text-muted-foreground">Branch</dt>
							<dd class="font-medium">{property.bank_branch}</dd>
						</div>
					{/if}
					{#if property.bank_account_number}
						<div>
							<dt class="text-muted-foreground">Account</dt>
							<dd class="font-mono font-medium">{property.bank_account_number}</dd>
						</div>
					{/if}
				</dl>
			</div>
		{/if}
	</section>

	<!-- Units -->
	<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
		<header class="mb-4 flex items-center justify-between border-b border-dashed border-border/60 pb-3">
			<div class="flex items-center gap-2">
				<Layers class="h-4 w-4 text-muted-foreground" />
				<h2 class="font-display text-base font-semibold">Units</h2>
				<span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
					{units.length}
				</span>
			</div>
		</header>

		{#if units.length > 0}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
							<th class="py-3 pr-4">Unit</th>
							<th class="py-3 pr-4">Floor</th>
							<th class="py-3 pr-4">Beds</th>
							<th class="py-3 pr-4">Baths</th>
							<th class="py-3 pr-4">Sqft</th>
							<th class="py-3">Status</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each units as unit}
							<tr class="transition-colors hover:bg-secondary/40">
								<td class="py-3 pr-4 font-medium">{unit.unitnumber}</td>
								<td class="py-3 pr-4 text-muted-foreground">{unit.floor || '—'}</td>
								<td class="py-3 pr-4 font-mono text-muted-foreground">{unit.bedrooms ?? '—'}</td>
								<td class="py-3 pr-4 font-mono text-muted-foreground">{unit.bathrooms ?? '—'}</td>
								<td class="py-3 pr-4 font-mono text-muted-foreground">
									{unit.squarefeet ? Number(unit.squarefeet).toLocaleString() : '—'}
								</td>
								<td class="py-3">
									<span class={statusBadgeClass(unit.status)}>
										{unit.status}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">No units have been added to this property yet.</p>
		{/if}
	</section>

	<!-- Agreements -->
	<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
		<header class="mb-4 flex items-center justify-between border-b border-dashed border-border/60 pb-3">
			<div class="flex items-center gap-2">
				<Hash class="h-4 w-4 text-muted-foreground" />
				<h2 class="font-display text-base font-semibold">Agreements</h2>
				<span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
					{agreements.length}
				</span>
			</div>
		</header>

		{#if agreements.length > 0}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
							<th class="py-3 pr-4">Title</th>
							<th class="py-3 pr-4">Tenant</th>
							<th class="py-3 pr-4">Unit</th>
							<th class="py-3 pr-4">Period</th>
							<th class="py-3 pr-4">Rent</th>
							<th class="py-3">Status</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each agreements as ag}
							<tr class="transition-colors hover:bg-secondary/40">
								<td class="py-3 pr-4">
									<a
										href="/agreements/{ag.id}"
										class="font-medium text-foreground transition-colors hover:text-primary"
									>
										{ag.title || ag.id.slice(0, 8)}
									</a>
								</td>
								<td class="py-3 pr-4 text-muted-foreground">
									{ag.rentee_name || ag.rentee_email || '—'}
								</td>
								<td class="py-3 pr-4 text-muted-foreground">{ag.unitnumber || '—'}</td>
								<td class="py-3 pr-4 text-muted-foreground">
									{formatDate(ag.startdate)} — {formatDate(ag.enddate)}
								</td>
								<td class="py-3 pr-4 font-mono">
									{formatCurrency(ag.rentamount, ag.currency)}
								</td>
								<td class="py-3">
									<span class={statusBadgeClass(ag.status)}>
										{ag.status}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">No agreements found for this property.</p>
		{/if}
	</section>
</div>
