<script>
	import { Receipt, ExternalLink } from 'lucide-svelte';

	let { data } = $props();
	const invoices = $derived(data.invoices);

	const formatDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
	const formatMoney = (n) => (n == null ? '—' : new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n)));

	const statusClass = (s) => {
		switch ((s || '').toLowerCase()) {
			case 'paid':
				return 'bg-success/15 text-success';
			case 'overdue':
				return 'bg-destructive/15 text-destructive';
			case 'pending':
				return 'bg-warning/20 text-warning-foreground dark:bg-warning/15 dark:text-warning';
			case 'cancelled':
				return 'bg-muted text-muted-foreground';
			default:
				return 'bg-muted text-muted-foreground';
		}
	};
</script>

<svelte:head>
	<title>My Invoices — KH Rentals</title>
</svelte:head>

<div class="max-w-4xl">
	<header class="mb-6">
		<p class="kicker">My invoices</p>
		<h1 class="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
			Bills issued to you
		</h1>
		<p class="mt-1 text-sm text-muted-foreground">Most recent first.</p>
	</header>

	{#if invoices.length === 0}
		<div class="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
			<Receipt class="mx-auto h-8 w-8 text-muted-foreground" />
			<p class="mt-3 text-sm font-medium text-foreground">No invoices yet</p>
			<p class="mt-1 text-xs text-muted-foreground">When your manager issues a bill, it'll show up here.</p>
		</div>
	{:else}
		<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
			<table class="w-full text-sm">
				<thead class="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground">
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
						<tr class="hover:bg-secondary/50">
							<td class="px-4 py-3 font-medium text-foreground">{inv.billingperiod || '—'}</td>
							<td class="px-4 py-3 text-foreground">
								<div class="truncate max-w-[14rem]">{inv.property_name || '—'}</div>
								{#if inv.property_address}
									<div class="text-xs text-muted-foreground truncate max-w-[14rem]">{inv.property_address}</div>
								{/if}
							</td>
							<td class="px-4 py-3 text-right font-mono text-foreground">{formatMoney(inv.totalamount)}</td>
							<td class="px-4 py-3 text-foreground">{formatDate(inv.duedate)}</td>
							<td class="px-4 py-3">
								<span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize {statusClass(inv.status)}">
									{inv.status || 'unknown'}
								</span>
							</td>
							<td class="px-4 py-3 text-foreground">
								{#if inv.paymentdate}
									{formatDate(inv.paymentdate)}
									{#if inv.paymentproofurl}
										<a href={inv.paymentproofurl} target="_blank" rel="noopener" class="ml-1 inline-flex items-center text-xs text-primary hover:underline">
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
