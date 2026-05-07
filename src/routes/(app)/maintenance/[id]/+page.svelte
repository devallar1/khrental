<script>
	import { ArrowLeft, Building2, User, Wrench, CalendarDays } from 'lucide-svelte';

	let { data } = $props();

	const req = $derived(data.request);

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
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	};

	const formatStatus = (s) => s?.replace(/_/g, ' ') || '—';
</script>

<svelte:head>
	<title>{req.title} — Maintenance — KH Rentals</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<header>
		<a
			href="/maintenance"
			class="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<ArrowLeft class="h-4 w-4" />
			Back to maintenance
		</a>
		<div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p class="kicker">Maintenance</p>
				<h1 class="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
					{req.title}
				</h1>
			</div>
			<div class="flex items-center gap-2">
				<span class="inline-flex rounded-full px-3 py-1 text-sm font-medium capitalize {priorityBadge(req.priority)}">
					{req.priority || 'none'}
				</span>
				<span class="inline-flex rounded-full px-3 py-1 text-sm font-medium capitalize {statusBadge(req.status)}">
					{formatStatus(req.status)}
				</span>
			</div>
		</div>
	</header>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Main details -->
		<div class="space-y-6 lg:col-span-2">
			<!-- Description -->
			<div class="rounded-2xl border border-border bg-card p-6">
				<p class="kicker mb-3">Description</p>
				<p class="whitespace-pre-wrap text-sm">{req.description || 'No description provided.'}</p>
			</div>

			<!-- Notes -->
			{#if req.notes}
				<div class="rounded-2xl border border-border bg-card p-6">
					<p class="kicker mb-3">Notes</p>
					<p class="whitespace-pre-wrap text-sm">{req.notes}</p>
				</div>
			{/if}
		</div>

		<!-- Sidebar info -->
		<div class="space-y-6">
			<!-- Property -->
			<div class="rounded-2xl border border-border bg-card p-5">
				<div class="mb-3 flex items-center gap-2">
					<Building2 class="h-4 w-4 text-muted-foreground" />
					<h3 class="font-display text-sm font-semibold">Property</h3>
				</div>
				<p class="text-sm font-medium">{req.property_name || '—'}</p>
				{#if req.property_address}
					<p class="mt-0.5 text-xs text-muted-foreground">{req.property_address}</p>
				{/if}
			</div>

			<!-- Reporter -->
			<div class="rounded-2xl border border-border bg-card p-5">
				<div class="mb-3 flex items-center gap-2">
					<User class="h-4 w-4 text-muted-foreground" />
					<h3 class="font-display text-sm font-semibold">Reported by</h3>
				</div>
				<p class="text-sm font-medium">{req.rentee_name || '—'}</p>
				{#if req.rentee_email}
					<p class="mt-0.5 text-xs text-muted-foreground">{req.rentee_email}</p>
				{/if}
			</div>

			<!-- Assigned to -->
			<div class="rounded-2xl border border-border bg-card p-5">
				<div class="mb-3 flex items-center gap-2">
					<Wrench class="h-4 w-4 text-muted-foreground" />
					<h3 class="font-display text-sm font-semibold">Assigned to</h3>
				</div>
				<p class="text-sm font-medium">{req.assigned_name || 'Unassigned'}</p>
				{#if req.assigned_email}
					<p class="mt-0.5 text-xs text-muted-foreground">{req.assigned_email}</p>
				{/if}
			</div>

			<!-- Meta -->
			<div class="rounded-2xl border border-border bg-card p-5">
				<div class="mb-3 flex items-center gap-2">
					<CalendarDays class="h-4 w-4 text-muted-foreground" />
					<h3 class="font-display text-sm font-semibold">Details</h3>
				</div>
				<dl class="space-y-2">
					<div>
						<dt class="kicker">Type</dt>
						<dd class="text-sm capitalize">{req.requesttype || '—'}</dd>
					</div>
					<div>
						<dt class="kicker">Created</dt>
						<dd class="text-sm">{formatDate(req.createdat)}</dd>
					</div>
				</dl>
			</div>
		</div>
	</div>
</div>
