<script>
	import { Search, Plus, Users, Mail, Phone, MapPin } from 'lucide-svelte';

	let { data } = $props();

	let searchQuery = $state('');
	let statusFilter = $state('all');

	const filtered = $derived(() => {
		let list = data.rentees;

		if (statusFilter !== 'all') {
			const isActive = statusFilter === 'active';
			list = list.filter((r) => r.active === isActive);
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((r) => {
				const name = (r.name || '').toLowerCase();
				const email = (r.email || '').toLowerCase();
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
		return ids
			.map((id) => data.propertiesMap[id])
			.filter(Boolean);
	};
</script>

<svelte:head>
	<title>Rentees - KH Rentals</title>
</svelte:head>

<div>
	<!-- Header -->
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">Rentees</h1>
			<p class="mt-1 text-sm text-slate-500">{data.rentees.length} total rentees</p>
		</div>
		<a
			href="/rentees/new"
			class="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
		>
			<Plus class="h-4 w-4" />
			Add Rentee
		</a>
	</div>

	<!-- Filters -->
	<div class="mb-6 flex flex-col gap-3 sm:flex-row">
		<div class="relative flex-1">
			<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
			<input
				type="text"
				placeholder="Search by name or email..."
				bind:value={searchQuery}
				class="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
			/>
		</div>
		<select
			bind:value={statusFilter}
			class="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
		>
			<option value="all">All Status</option>
			<option value="active">Active</option>
			<option value="inactive">Inactive</option>
		</select>
	</div>

	<!-- Grid -->
	{#if filtered().length > 0}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each filtered() as rentee}
				<a
					href="/rentees/{rentee.id}"
					class="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
				>
					<div class="flex items-start justify-between">
						<div class="flex items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
								{(rentee.name || '?').charAt(0).toUpperCase()}
							</div>
							<div>
								<h3 class="font-semibold text-slate-900 group-hover:text-sky-700">
									{rentee.name || 'Unnamed'}
								</h3>
								{#if rentee.email}
									<p class="flex items-center gap-1 text-xs text-slate-500">
										<Mail class="h-3 w-3" />
										{rentee.email}
									</p>
								{/if}
							</div>
						</div>
						<span
							class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {rentee.active
								? 'bg-emerald-50 text-emerald-700'
								: 'bg-slate-100 text-slate-600'}"
						>
							{rentee.active ? 'Active' : 'Inactive'}
						</span>
					</div>

					{#if getPhone(rentee.contact_details)}
						<p class="mt-3 flex items-center gap-1.5 text-sm text-slate-600">
							<Phone class="h-3.5 w-3.5 text-slate-400" />
							{getPhone(rentee.contact_details)}
						</p>
					{/if}

					{#if getPropertyNames(rentee.associated_property_ids).length > 0}
						<div class="mt-3 flex flex-wrap gap-1.5">
							{#each getPropertyNames(rentee.associated_property_ids) as propName}
								<span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
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
		<div class="rounded-2xl border border-slate-200 bg-white py-16 text-center">
			<Users class="mx-auto h-12 w-12 text-slate-300" />
			<h3 class="mt-4 text-lg font-semibold text-slate-900">No rentees found</h3>
			<p class="mt-1 text-sm text-slate-500">
				{#if searchQuery || statusFilter !== 'all'}
					Try adjusting your search or filters.
				{:else}
					Get started by adding your first rentee.
				{/if}
			</p>
			{#if !searchQuery && statusFilter === 'all'}
				<a
					href="/rentees/new"
					class="mt-4 inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
				>
					<Plus class="h-4 w-4" />
					Add Rentee
				</a>
			{/if}
		</div>
	{/if}
</div>
