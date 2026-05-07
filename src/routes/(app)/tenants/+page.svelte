<script>
	import { Search, Plus, Users, Mail, Phone, MapPin, Inbox } from 'lucide-svelte';

	let { data } = $props();

	let searchQuery = $state('');
	let statusFilter = $state('all');

	const filtered = $derived(() => {
		let list = data.tenants;

		if (statusFilter !== 'all') {
			const isActive = statusFilter === 'active';
			list = list.filter((t) => t.active === isActive);
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((t) => {
				const name = (t.name || '').toLowerCase();
				const email = (t.email || '').toLowerCase();
				return name.includes(q) || email.includes(q);
			});
		}

		return list;
	});

	const getPhone = (contactDetails) => {
		if (!contactDetails) return null;
		if (typeof contactDetails === 'string') {
			try {
				return JSON.parse(contactDetails)?.phone || null;
			} catch {
				return null;
			}
		}
		return contactDetails?.phone || null;
	};

	const getPropertyNames = (ids) => {
		if (!ids || !Array.isArray(ids) || ids.length === 0) return [];
		return ids.map((id) => data.propertiesMap[id]).filter(Boolean);
	};
</script>

<svelte:head>
	<title>Tenants — KH Rentals</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="kicker">Tenants</p>
			<h1 class="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
				All tenants
			</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				{data.tenants.length}
				{data.tenants.length === 1 ? 'tenant' : 'tenants'} on file
			</p>
		</div>
		<a
			href="/tenants/new"
			class="inline-flex items-center gap-2 self-start rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
		>
			<Plus class="h-4 w-4" />
			Add tenant
		</a>
	</header>

	<!-- Filters -->
	<div class="flex flex-col gap-3 sm:flex-row">
		<div class="relative flex-1">
			<Search
				class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
			/>
			<input
				type="text"
				placeholder="Search by name or email…"
				bind:value={searchQuery}
				class="w-full rounded-2xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
			/>
		</div>
		<select
			bind:value={statusFilter}
			class="rounded-2xl border border-input bg-background px-4 py-2.5 text-sm text-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
		>
			<option value="all">All status</option>
			<option value="active">Active</option>
			<option value="inactive">Inactive</option>
		</select>
	</div>

	<!-- Grid -->
	{#if filtered().length > 0}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each filtered() as tenant}
				<a
					href="/tenants/{tenant.id}"
					class="group rounded-2xl border border-border bg-card p-5 glow-primary transition-all duration-400 ease-smooth hover:-translate-y-1"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="flex min-w-0 items-center gap-3">
							<div
								class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary"
							>
								{(tenant.name || '?').charAt(0).toUpperCase()}
							</div>
							<div class="min-w-0">
								<h3 class="truncate font-display text-base font-semibold text-foreground group-hover:text-primary">
									{tenant.name || 'Unnamed'}
								</h3>
								{#if tenant.email}
									<p class="flex items-center gap-1 truncate text-xs text-muted-foreground">
										<Mail class="h-3 w-3 flex-shrink-0" />
										<span class="truncate">{tenant.email}</span>
									</p>
								{/if}
							</div>
						</div>
						{#if tenant.active}
							<span
								class="flex-shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success"
							>
								Active
							</span>
						{:else}
							<span
								class="flex-shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
							>
								Inactive
							</span>
						{/if}
					</div>

					{#if getPhone(tenant.contact_details)}
						<p class="mt-3 flex items-center gap-1.5 text-sm">
							<Phone class="h-3.5 w-3.5 text-muted-foreground" />
							<span class="font-mono text-xs">{getPhone(tenant.contact_details)}</span>
						</p>
					{/if}

					{#if getPropertyNames(tenant.associated_property_ids).length > 0}
						<div class="mt-3 flex flex-wrap gap-1.5">
							{#each getPropertyNames(tenant.associated_property_ids) as propName}
								<span
									class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
								>
									<MapPin class="h-3 w-3" />
									{propName}
								</span>
							{/each}
						</div>
					{/if}
				</a>
			{/each}
		</div>
	{:else}
		<!-- Empty state -->
		<div
			class="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card py-12 text-center"
		>
			<div class="rounded-2xl bg-secondary p-4 text-muted-foreground">
				{#if searchQuery || statusFilter !== 'all'}
					<Inbox class="h-6 w-6" />
				{:else}
					<Users class="h-6 w-6" />
				{/if}
			</div>
			<p class="mt-4 font-display text-lg font-semibold">
				{searchQuery || statusFilter !== 'all' ? 'No tenants found' : 'No tenants yet'}
			</p>
			<p class="mt-1 max-w-sm text-sm text-muted-foreground">
				{#if searchQuery || statusFilter !== 'all'}
					Try adjusting your search or filters.
				{:else}
					Get started by adding the first tenant.
				{/if}
			</p>
			{#if !searchQuery && statusFilter === 'all'}
				<a
					href="/tenants/new"
					class="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
				>
					<Plus class="h-4 w-4" />
					Add tenant
				</a>
			{/if}
		</div>
	{/if}
</div>
