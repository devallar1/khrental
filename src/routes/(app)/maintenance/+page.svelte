<script>
	import { Wrench, Inbox } from 'lucide-svelte';

	let { data } = $props();

	const requests = $derived(data.requests || []);
	const statusFilter = $derived(data.statusFilter || 'all');

	const statuses = ['all', 'pending', 'in_progress', 'completed', 'cancelled'];

	const priorityBadge = (priority) => {
		switch (priority?.toLowerCase()) {
			case 'urgent':
			case 'high':
				return 'bg-destructive/15 text-destructive';
			case 'medium':
				return 'bg-warning/20 text-warning-foreground dark:bg-warning/15 dark:text-warning';
			case 'low':
				return 'bg-success/15 text-success';
			default:
				return 'bg-muted text-muted-foreground';
		}
	};

	const statusBadge = (status) => {
		switch (status?.toLowerCase()) {
			case 'pending':
				return 'bg-warning/20 text-warning-foreground dark:bg-warning/15 dark:text-warning';
			case 'in_progress':
				return 'bg-primary/15 text-primary';
			case 'completed':
				return 'bg-success/15 text-success';
			case 'cancelled':
				return 'bg-muted text-muted-foreground';
			default:
				return 'bg-muted text-muted-foreground';
		}
	};

	const formatDate = (dateStr) => {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-GB', {
			month: 'short',
			day: '2-digit',
			year: 'numeric'
		});
	};

	const formatStatus = (s) => s?.replace(/_/g, ' ') || '—';
</script>

<svelte:head>
	<title>Maintenance — KH Rentals</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<header>
		<p class="kicker">Maintenance</p>
		<h1 class="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
			Requests
		</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			{requests.length}
			{requests.length === 1 ? 'request' : 'requests'}
		</p>
	</header>

	<!-- Status filter -->
	<div class="flex flex-wrap gap-2">
		{#each statuses as s}
			<a
				href="/maintenance{s === 'all' ? '' : `?status=${s}`}"
				class={`rounded-2xl px-3.5 py-1.5 text-sm font-medium capitalize transition-all duration-200 ease-smooth ${
					statusFilter === s
						? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-sm'
						: 'border border-border bg-card text-foreground hover:-translate-y-0.5 hover:bg-secondary'
				}`}
			>
				{formatStatus(s === 'all' ? 'All' : s)}
			</a>
		{/each}
	</div>

	{#if requests.length === 0}
		<div
			class="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card py-12 text-center"
		>
			<div class="rounded-2xl bg-secondary p-4 text-muted-foreground">
				{#if statusFilter !== 'all'}
					<Inbox class="h-6 w-6" />
				{:else}
					<Wrench class="h-6 w-6" />
				{/if}
			</div>
			<p class="mt-4 font-display text-lg font-semibold">No maintenance requests</p>
			<p class="mt-1 max-w-sm text-sm text-muted-foreground">
				{statusFilter !== 'all'
					? `No ${formatStatus(statusFilter)} requests found.`
					: 'No requests have been submitted yet.'}
			</p>
		</div>
	{:else}
		<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-border">
					<thead class="bg-secondary/50">
						<tr>
							<th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
								>Title</th
							>
							<th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
								>Property</th
							>
							<th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
								>Tenant</th
							>
							<th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
								>Priority</th
							>
							<th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
								>Status</th
							>
							<th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
								>Created</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each requests as req}
							<tr class="transition-colors hover:bg-secondary/40">
								<td class="px-4 py-3">
									<a
										href="/maintenance/{req.id}"
										class="text-sm font-medium text-foreground transition-colors hover:text-primary"
									>
										{req.title}
									</a>
								</td>
								<td class="px-4 py-3 text-sm text-muted-foreground">{req.property_name || '—'}</td>
								<td class="px-4 py-3 text-sm text-muted-foreground">{req.rentee_name || '—'}</td>
								<td class="px-4 py-3">
									<span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize {priorityBadge(req.priority)}">
										{req.priority || '—'}
									</span>
								</td>
								<td class="px-4 py-3">
									<span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize {statusBadge(req.status)}">
										{formatStatus(req.status)}
									</span>
								</td>
								<td class="px-4 py-3 text-sm text-muted-foreground">{formatDate(req.createdat)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
