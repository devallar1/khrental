<script>
	import { Receipt, Search, Plus, ChevronRight } from 'lucide-svelte';
	import { formatCurrency } from '$lib/format/money.js';

	let { data } = $props();

	let searchQuery = $state('');
	let statusFilter = $state('all');

	const statusOptions = ['all', 'pending', 'paid', 'overdue', 'cancelled'];

	const filtered = $derived(() => {
		let list = data.invoices || [];

		if (statusFilter !== 'all') {
			list = list.filter((inv) => inv.status === statusFilter);
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter(
				(inv) =>
					inv.tenant_name?.toLowerCase().includes(q) ||
					inv.tenant_email?.toLowerCase().includes(q) ||
					inv.property_name?.toLowerCase().includes(q) ||
					inv.billingperiod?.toLowerCase().includes(q)
			);
		}

		return list;
	});

	const formatDate = (dateStr) => {
		if (!dateStr) return '--';
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	};

	const statusBadgeClass = (status) => {
		const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize';
		switch (status) {
			case 'paid':
				return `${base} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20`;
			case 'pending':
				return `${base} bg-amber-50 text-amber-700 ring-1 ring-amber-600/20`;
			case 'overdue':
				return `${base} bg-red-50 text-red-700 ring-1 ring-red-600/20`;
			case 'cancelled':
				return `${base} bg-slate-50 text-slate-600 ring-1 ring-slate-500/20`;
			default:
				return `${base} bg-slate-50 text-slate-600 ring-1 ring-slate-500/20`;
		}
	};
</script>

<svelte:head>
	<title>Invoices - KH Rentals</title>
</svelte:head>

<div>
	<!-- Header -->
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">Invoices</h1>
			<p class="mt-1 text-sm text-slate-500">
				{data.invoices?.length || 0} total invoice{data.invoices?.length === 1 ? '' : 's'}
			</p>
		</div>
		<a
			href="/invoices/generate"
			class="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
		>
			<Plus class="h-4 w-4" />
			Generate Invoice
		</a>
	</div>

	<!-- Filters -->
	<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
		<div class="relative flex-1">
			<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by rentee, property, or billing period..."
				class="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
			/>
		</div>
		<div class="flex gap-1.5 overflow-x-auto">
			{#each statusOptions as opt}
				<button
					onclick={() => (statusFilter = opt)}
					class="whitespace-nowrap rounded-2xl px-3 py-2 text-sm font-medium transition {statusFilter === opt
						? 'bg-slate-900 text-white shadow-sm'
						: 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}"
				>
					{opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
				</button>
			{/each}
		</div>
	</div>

	<!-- Table -->
	{#if filtered().length === 0}
		<div class="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
			<Receipt class="mx-auto h-12 w-12 text-slate-300" />
			<h3 class="mt-4 text-sm font-medium text-slate-900">No invoices found</h3>
			<p class="mt-1 text-sm text-slate-500">
				{#if searchQuery || statusFilter !== 'all'}
					Try adjusting your search or filter.
				{:else}
					Get started by generating your first invoice.
				{/if}
			</p>
		</div>
	{:else}
		<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-slate-200">
					<thead class="bg-slate-50">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
								Billing Period
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
								Rentee
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
								Property
							</th>
							<th class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
								Amount
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
								Status
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
								Due Date
							</th>
							<th class="px-4 py-3"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each filtered() as invoice}
							<tr class="transition hover:bg-slate-50">
								<td class="whitespace-nowrap px-4 py-3.5 text-sm font-medium text-slate-900">
									{invoice.billingperiod || '--'}
								</td>
								<td class="whitespace-nowrap px-4 py-3.5 text-sm text-slate-600">
									{invoice.tenant_name || invoice.tenant_email || '--'}
								</td>
								<td class="whitespace-nowrap px-4 py-3.5 text-sm text-slate-600">
									{invoice.property_name || '--'}
								</td>
								<td class="whitespace-nowrap px-4 py-3.5 text-right text-sm font-medium text-slate-900">
									{formatCurrency(invoice.totalamount, invoice.currency)}
								</td>
								<td class="whitespace-nowrap px-4 py-3.5">
									<span class={statusBadgeClass(invoice.status)}>
										{invoice.status || 'unknown'}
									</span>
								</td>
								<td class="whitespace-nowrap px-4 py-3.5 text-sm text-slate-600">
									{formatDate(invoice.duedate)}
								</td>
								<td class="whitespace-nowrap px-4 py-3.5 text-right">
									<a
										href="/invoices/{invoice.id}"
										class="inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-slate-900"
									>
										View
										<ChevronRight class="h-4 w-4" />
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
