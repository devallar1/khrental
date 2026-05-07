<script>
	import { Receipt, Search, Plus, ChevronRight, Inbox } from 'lucide-svelte';
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
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-GB', {
			year: 'numeric',
			month: 'short',
			day: '2-digit'
		});
	};

	const statusBadgeClass = (status) => {
		switch (status) {
			case 'paid':
				return 'inline-flex rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium capitalize text-success';
			case 'pending':
				return 'inline-flex rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-medium capitalize text-warning-foreground dark:bg-warning/15 dark:text-warning';
			case 'overdue':
				return 'inline-flex rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-medium capitalize text-destructive';
			case 'cancelled':
				return 'inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize text-muted-foreground';
			default:
				return 'inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize text-muted-foreground';
		}
	};
</script>

<svelte:head>
	<title>Invoices — KH Rentals</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="kicker">Invoices</p>
			<h1 class="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
				All invoices
			</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				{data.invoices?.length || 0}
				{data.invoices?.length === 1 ? 'invoice' : 'invoices'}
			</p>
		</div>
		<a
			href="/invoices/generate"
			class="inline-flex items-center gap-2 self-start rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
		>
			<Plus class="h-4 w-4" />
			Generate invoice
		</a>
	</header>

	<!-- Filters -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
		<div class="relative flex-1">
			<Search
				class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
			/>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by tenant, property, or billing period…"
				class="w-full rounded-2xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
			/>
		</div>
		<div class="flex flex-wrap gap-2">
			{#each statusOptions as opt}
				<button
					onclick={() => (statusFilter = opt)}
					class={`rounded-2xl px-3.5 py-1.5 text-sm font-medium capitalize transition-all duration-200 ease-smooth ${
						statusFilter === opt
							? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-sm'
							: 'border border-border bg-card text-foreground hover:-translate-y-0.5 hover:bg-secondary'
					}`}
				>
					{opt === 'all' ? 'All' : opt}
				</button>
			{/each}
		</div>
	</div>

	<!-- Table -->
	{#if filtered().length === 0}
		<div
			class="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card py-12 text-center"
		>
			<div class="rounded-2xl bg-secondary p-4 text-muted-foreground">
				{#if searchQuery || statusFilter !== 'all'}
					<Inbox class="h-6 w-6" />
				{:else}
					<Receipt class="h-6 w-6" />
				{/if}
			</div>
			<p class="mt-4 font-display text-lg font-semibold">
				{searchQuery || statusFilter !== 'all' ? 'No invoices found' : 'No invoices yet'}
			</p>
			<p class="mt-1 max-w-sm text-sm text-muted-foreground">
				{#if searchQuery || statusFilter !== 'all'}
					Try adjusting your search or filter.
				{:else}
					Get started by generating your first invoice.
				{/if}
			</p>
			{#if !searchQuery && statusFilter === 'all'}
				<a
					href="/invoices/generate"
					class="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
				>
					<Plus class="h-4 w-4" />
					Generate invoice
				</a>
			{/if}
		</div>
	{:else}
		<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-border">
					<thead class="bg-secondary/50">
						<tr>
							<th
								class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
								>Billing Period</th
							>
							<th
								class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
								>Tenant</th
							>
							<th
								class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
								>Property</th
							>
							<th
								class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
								>Amount</th
							>
							<th
								class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
								>Status</th
							>
							<th
								class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
								>Due</th
							>
							<th class="px-4 py-3"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each filtered() as invoice}
							<tr class="transition-colors hover:bg-secondary/40">
								<td class="whitespace-nowrap px-4 py-3.5 text-sm font-medium">
									{invoice.billingperiod || '—'}
								</td>
								<td class="whitespace-nowrap px-4 py-3.5 text-sm text-muted-foreground">
									{invoice.tenant_name || invoice.tenant_email || '—'}
								</td>
								<td class="whitespace-nowrap px-4 py-3.5 text-sm text-muted-foreground">
									{invoice.property_name || '—'}
								</td>
								<td class="whitespace-nowrap px-4 py-3.5 text-right font-mono text-sm">
									{formatCurrency(invoice.totalamount, invoice.currency)}
								</td>
								<td class="whitespace-nowrap px-4 py-3.5">
									<span class={statusBadgeClass(invoice.status)}>
										{invoice.status || 'unknown'}
									</span>
								</td>
								<td class="whitespace-nowrap px-4 py-3.5 text-sm text-muted-foreground">
									{formatDate(invoice.duedate)}
								</td>
								<td class="whitespace-nowrap px-4 py-3.5 text-right">
									<a
										href="/invoices/{invoice.id}"
										class="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
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
