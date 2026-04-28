<script>
	import { Search, Plus, FileText } from 'lucide-svelte';

	let { data } = $props();

	let searchQuery = $state('');
	let statusFilter = $state('all');

	const statusOptions = ['all', 'draft', 'active', 'signed', 'cancelled'];

	const statusBadgeClass = (status) => {
		const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
		switch (status) {
			case 'active':
			case 'signed':
				return `${base} bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20`;
			case 'draft':
				return `${base} bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20`;
			case 'cancelled':
				return `${base} bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20`;
			case 'pending':
				return `${base} bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20`;
			default:
				return `${base} bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20`;
		}
	};

	const formatDate = (dateStr) => {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	};

	const formatCurrency = (amount) => {
		if (amount == null) return '-';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
	};

	const filtered = $derived(
		data.agreements.filter((a) => {
			const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
			const matchesSearch =
				!searchQuery ||
				a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				a.rentee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				a.property_name?.toLowerCase().includes(searchQuery.toLowerCase());
			return matchesStatus && matchesSearch;
		})
	);
</script>

<svelte:head>
	<title>Agreements - KH Rentals</title>
</svelte:head>

<div>
	<!-- Header -->
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">Agreements</h1>
			<p class="mt-1 text-sm text-slate-500">{filtered.length} agreement{filtered.length !== 1 ? 's' : ''}</p>
		</div>
		<a
			href="/agreements/new"
			class="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
		>
			<Plus class="h-4 w-4" />
			New Agreement
		</a>
	</div>

	<!-- Filters -->
	<div class="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
			<!-- Search -->
			<div class="relative flex-1">
				<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
				<input
					type="text"
					placeholder="Search agreements..."
					bind:value={searchQuery}
					class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
				/>
			</div>

			<!-- Status filter -->
			<div class="flex gap-1.5 overflow-x-auto">
				{#each statusOptions as status}
					<button
						onclick={() => (statusFilter = status)}
						class="whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition {statusFilter === status
							? 'bg-slate-900 text-white'
							: 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
					>
						{status.charAt(0).toUpperCase() + status.slice(1)}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- Table -->
	{#if filtered.length > 0}
		<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead>
						<tr class="border-b border-slate-100 bg-slate-50">
							<th class="px-4 py-3 font-medium text-slate-500">Title</th>
							<th class="px-4 py-3 font-medium text-slate-500">Rentee</th>
							<th class="px-4 py-3 font-medium text-slate-500">Property</th>
							<th class="px-4 py-3 font-medium text-slate-500">Status</th>
							<th class="px-4 py-3 font-medium text-slate-500 text-right">Rent</th>
							<th class="px-4 py-3 font-medium text-slate-500">Start</th>
							<th class="px-4 py-3 font-medium text-slate-500">End</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each filtered as agreement}
							<tr class="transition hover:bg-slate-50">
								<td class="px-4 py-3">
									<a
										href="/agreements/{agreement.id}"
										class="font-medium text-slate-900 hover:text-blue-600"
									>
										{agreement.title || 'Untitled'}
									</a>
								</td>
								<td class="px-4 py-3 text-slate-600">{agreement.rentee_name || '-'}</td>
								<td class="px-4 py-3 text-slate-600">{agreement.property_name || '-'}</td>
								<td class="px-4 py-3">
									<span class={statusBadgeClass(agreement.status)}>
										{agreement.status || 'draft'}
									</span>
								</td>
								<td class="px-4 py-3 text-right text-slate-600">{formatCurrency(agreement.rentamount)}</td>
								<td class="px-4 py-3 text-slate-600">{formatDate(agreement.startdate)}</td>
								<td class="px-4 py-3 text-slate-600">{formatDate(agreement.enddate)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<div class="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
			<FileText class="mx-auto h-12 w-12 text-slate-300" />
			<h3 class="mt-4 text-sm font-medium text-slate-900">No agreements found</h3>
			<p class="mt-1 text-sm text-slate-500">
				{searchQuery || statusFilter !== 'all'
					? 'Try adjusting your search or filters.'
					: 'Get started by creating a new agreement.'}
			</p>
			{#if !searchQuery && statusFilter === 'all'}
				<a
					href="/agreements/new"
					class="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
				>
					<Plus class="h-4 w-4" />
					New Agreement
				</a>
			{/if}
		</div>
	{/if}
</div>
