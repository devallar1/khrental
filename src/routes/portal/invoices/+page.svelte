<script>
	import { Receipt, ExternalLink } from 'lucide-svelte';

	let { data } = $props();
	const invoices = $derived(data.invoices);

	const formatDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
	const formatMoney = (n) => (n == null ? '—' : new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n)));

	const statusClass = (s) => {
		switch ((s || '').toLowerCase()) {
			case 'paid': return 'bg-emerald-100 text-emerald-700';
			case 'overdue': return 'bg-rose-100 text-rose-700';
			case 'pending': return 'bg-amber-100 text-amber-700';
			case 'cancelled': return 'bg-slate-200 text-slate-600';
			default: return 'bg-slate-100 text-slate-700';
		}
	};
</script>

<svelte:head>
	<title>My Invoices — KH Rentals</title>
</svelte:head>

<div class="max-w-4xl">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">My Invoices</h1>
		<p class="mt-1 text-sm text-slate-500">Bills issued to you. Most recent first.</p>
	</div>

	{#if invoices.length === 0}
		<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
			<Receipt class="mx-auto h-8 w-8 text-slate-300" />
			<p class="mt-3 text-sm font-medium text-slate-700">No invoices yet</p>
			<p class="mt-1 text-xs text-slate-500">When your manager issues a bill, it'll show up here.</p>
		</div>
	{:else}
		<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
			<table class="w-full text-sm">
				<thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
					<tr>
						<th class="px-4 py-3 text-left font-medium">Period</th>
						<th class="px-4 py-3 text-left font-medium">Property</th>
						<th class="px-4 py-3 text-right font-medium">Amount</th>
						<th class="px-4 py-3 text-left font-medium">Due</th>
						<th class="px-4 py-3 text-left font-medium">Status</th>
						<th class="px-4 py-3 text-left font-medium">Paid</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					{#each invoices as inv}
						<tr class="hover:bg-slate-50">
							<td class="px-4 py-3 font-medium text-slate-900">{inv.billingperiod || '—'}</td>
							<td class="px-4 py-3 text-slate-700">
								<div class="truncate max-w-[14rem]">{inv.property_name || '—'}</div>
								{#if inv.property_address}
									<div class="text-xs text-slate-400 truncate max-w-[14rem]">{inv.property_address}</div>
								{/if}
							</td>
							<td class="px-4 py-3 text-right font-mono text-slate-900">{formatMoney(inv.totalamount)}</td>
							<td class="px-4 py-3 text-slate-700">{formatDate(inv.duedate)}</td>
							<td class="px-4 py-3">
								<span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize {statusClass(inv.status)}">
									{inv.status || 'unknown'}
								</span>
							</td>
							<td class="px-4 py-3 text-slate-700">
								{#if inv.paymentdate}
									{formatDate(inv.paymentdate)}
									{#if inv.paymentproofurl}
										<a href={inv.paymentproofurl} target="_blank" rel="noopener" class="ml-1 inline-flex items-center text-xs text-sky-600 hover:underline">
											proof <ExternalLink class="ml-0.5 h-3 w-3" />
										</a>
									{/if}
								{:else}
									—
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
