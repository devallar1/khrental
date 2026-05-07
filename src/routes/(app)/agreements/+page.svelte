<script>
	import { Search, Plus, FileText, Inbox } from 'lucide-svelte';
	import { formatCurrency } from '$lib/format/money.js';

	let { data } = $props();

	let searchQuery = $state('');
	let statusFilter = $state('all');

	const statusOptions = ['all', 'draft', 'active', 'signed', 'cancelled'];

	const statusBadgeClass = (status) => {
		switch (status) {
			case 'active':
			case 'signed':
				return 'inline-flex rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success';
			case 'draft':
				return 'inline-flex rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary';
			case 'cancelled':
				return 'inline-flex rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive';
			case 'pending':
				return 'inline-flex rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-medium text-warning-foreground dark:bg-warning/15 dark:text-warning';
			default:
				return 'inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground';
		}
	};

	const formatDate = (dateStr) => {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-GB', {
			year: 'numeric',
			month: 'short',
			day: '2-digit'
		});
	};

	const filtered = $derived(
		data.agreements.filter((a) => {
			const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
			const matchesSearch =
				!searchQuery ||
				a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				a.tenant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				a.property_name?.toLowerCase().includes(searchQuery.toLowerCase());
			return matchesStatus && matchesSearch;
		})
	);
</script>

<svelte:head>
	<title>Agreements — KH Rentals</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="kicker">Agreements</p>
			<h1 class="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
				All agreements
			</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				{filtered.length}
				{filtered.length === 1 ? 'agreement' : 'agreements'}
			</p>
		</div>
		<a
			href="/agreements/new"
			class="inline-flex items-center gap-2 self-start rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
		>
			<Plus class="h-4 w-4" />
			New agreement
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
				placeholder="Search agreements…"
				bind:value={searchQuery}
				class="w-full rounded-2xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
			/>
		</div>
		<div class="flex flex-wrap gap-2">
			{#each statusOptions as status}
				<button
					onclick={() => (statusFilter = status)}
					class={`rounded-2xl px-3.5 py-1.5 text-sm font-medium capitalize transition-all duration-200 ease-smooth ${
						statusFilter === status
							? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-sm'
							: 'border border-border bg-card text-foreground hover:-translate-y-0.5 hover:bg-secondary'
					}`}
				>
					{status === 'all' ? 'All' : status}
				</button>
			{/each}
		</div>
	</div>

	<!-- Table -->
	{#if filtered.length > 0}
		<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-border">
					<thead class="bg-secondary/50">
						<tr>
							<th
								class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
								>Title</th
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
								class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
								>Status</th
							>
							<th
								class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
								>Rent</th
							>
							<th
								class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
								>Start</th
							>
							<th
								class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
								>End</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each filtered as agreement}
							<tr class="transition-colors hover:bg-secondary/40">
								<td class="px-4 py-3 text-sm">
									<a
										href="/agreements/{agreement.id}"
										class="font-medium text-foreground transition-colors hover:text-primary"
									>
										{agreement.title || 'Untitled'}
									</a>
								</td>
								<td class="px-4 py-3 text-sm text-muted-foreground">{agreement.tenant_name || '—'}</td>
								<td class="px-4 py-3 text-sm text-muted-foreground">{agreement.property_name || '—'}</td>
								<td class="px-4 py-3">
									<span class="{statusBadgeClass(agreement.status)} capitalize">
										{agreement.status || 'draft'}
									</span>
								</td>
								<td class="px-4 py-3 text-right font-mono text-sm">
									{formatCurrency(agreement.rentamount, agreement.currency)}
								</td>
								<td class="px-4 py-3 text-sm text-muted-foreground">{formatDate(agreement.startdate)}</td>
								<td class="px-4 py-3 text-sm text-muted-foreground">{formatDate(agreement.enddate)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<div
			class="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card py-12 text-center"
		>
			<div class="rounded-2xl bg-secondary p-4 text-muted-foreground">
				{#if searchQuery || statusFilter !== 'all'}
					<Inbox class="h-6 w-6" />
				{:else}
					<FileText class="h-6 w-6" />
				{/if}
			</div>
			<p class="mt-4 font-display text-lg font-semibold">
				{searchQuery || statusFilter !== 'all' ? 'No agreements found' : 'No agreements yet'}
			</p>
			<p class="mt-1 max-w-sm text-sm text-muted-foreground">
				{searchQuery || statusFilter !== 'all'
					? 'Try adjusting your search or filters.'
					: 'Get started by creating a new agreement.'}
			</p>
			{#if !searchQuery && statusFilter === 'all'}
				<a
					href="/agreements/new"
					class="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
				>
					<Plus class="h-4 w-4" />
					New agreement
				</a>
			{/if}
		</div>
	{/if}
</div>
