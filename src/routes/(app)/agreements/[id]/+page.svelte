<script>
	import { ArrowLeft, FileText, User, Building2, Calendar } from 'lucide-svelte';
	import { formatCurrency } from '$lib/format/money.js';

	let { data } = $props();

	const a = $derived(data.agreement);

	const statusBadgeClass = (status) => {
		switch (status) {
			case 'active':
			case 'signed':
				return 'inline-flex items-center rounded-full bg-success/15 px-3 py-1 text-sm font-medium capitalize text-success';
			case 'draft':
				return 'inline-flex items-center rounded-full bg-primary/15 px-3 py-1 text-sm font-medium capitalize text-primary';
			case 'cancelled':
				return 'inline-flex items-center rounded-full bg-destructive/15 px-3 py-1 text-sm font-medium capitalize text-destructive';
			case 'pending':
				return 'inline-flex items-center rounded-full bg-warning/20 px-3 py-1 text-sm font-medium capitalize text-warning-foreground dark:bg-warning/15 dark:text-warning';
			default:
				return 'inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-medium capitalize text-muted-foreground';
		}
	};

	const formatDate = (dateStr) => {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-GB', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	};
</script>

<svelte:head>
	<title>{a.title || 'Agreement'} — KH Rentals</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<header>
		<a
			href="/agreements"
			class="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<ArrowLeft class="h-4 w-4" />
			Back to agreements
		</a>

		<div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p class="kicker">Agreement</p>
				<h1 class="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
					{a.title || 'Untitled agreement'}
				</h1>
				<p class="mt-0.5 text-xs text-muted-foreground">Created {formatDate(a.createdat)}</p>
			</div>
			<span class={statusBadgeClass(a.status)}>
				{a.status || 'draft'}
			</span>
		</div>
	</header>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Main content -->
		<div class="space-y-6 lg:col-span-2">
			<!-- Agreement Details -->
			<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
				<h2 class="flex items-center gap-2 font-display text-base font-semibold">
					<FileText class="h-4 w-4 text-muted-foreground" />
					Agreement details
				</h2>

				<dl class="mt-4 grid gap-4 sm:grid-cols-2">
					<div>
						<dt class="kicker mb-1">Start date</dt>
						<dd class="text-sm">{formatDate(a.startdate)}</dd>
					</div>
					<div>
						<dt class="kicker mb-1">End date</dt>
						<dd class="text-sm">{formatDate(a.enddate)}</dd>
					</div>
					<div>
						<dt class="kicker mb-1">Monthly rent</dt>
						<dd class="font-mono text-sm font-semibold">
							{formatCurrency(a.rentamount, a.currency)}
						</dd>
					</div>
					<div>
						<dt class="kicker mb-1">Security deposit</dt>
						<dd class="font-mono text-sm">{formatCurrency(a.depositamount, a.currency)}</dd>
					</div>
				</dl>

				{#if a.template_name}
					<div class="mt-4 border-t border-border pt-4">
						<dt class="kicker mb-1">Template</dt>
						<dd class="text-sm">
							{a.template_name}
							<span class="text-muted-foreground"
								>v{a.template_version || '1.0'} / {a.template_language || 'English'}</span
							>
						</dd>
					</div>
				{/if}
			</section>

			<!-- Content -->
			{#if a.content}
				<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
					<h2 class="font-display text-base font-semibold">Content</h2>
					<div class="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{a.content}</div>
				</section>
			{/if}

			<!-- Notes -->
			{#if a.notes}
				<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
					<h2 class="font-display text-base font-semibold">Notes</h2>
					<div class="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
						{a.notes}
					</div>
				</section>
			{/if}
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Tenant -->
			<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
				<h2 class="flex items-center gap-2 font-display text-base font-semibold">
					<User class="h-4 w-4 text-muted-foreground" />
					Tenant
				</h2>
				{#if a.tenant_name}
					<div class="mt-4 space-y-2">
						<p class="text-sm font-medium">{a.tenant_name}</p>
						{#if a.tenant_email}
							<p class="text-sm text-muted-foreground">{a.tenant_email}</p>
						{/if}
						{#if a.tenant_phone}
							<p class="font-mono text-sm text-muted-foreground">{a.tenant_phone}</p>
						{/if}
					</div>
				{:else}
					<p class="mt-4 text-sm text-muted-foreground">No tenant assigned</p>
				{/if}
			</section>

			<!-- Property -->
			<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
				<h2 class="flex items-center gap-2 font-display text-base font-semibold">
					<Building2 class="h-4 w-4 text-muted-foreground" />
					Property
				</h2>
				{#if a.property_name}
					<div class="mt-4 space-y-2">
						<p class="text-sm font-medium">{a.property_name}</p>
						{#if a.property_address}
							<p class="text-sm text-muted-foreground">{a.property_address}</p>
						{/if}
						{#if a.property_city}
							<p class="text-sm text-muted-foreground">{a.property_city}</p>
						{/if}
						{#if a.unit_number}
							<p class="text-sm text-muted-foreground">Unit {a.unit_number}</p>
						{/if}
					</div>
				{:else}
					<p class="mt-4 text-sm text-muted-foreground">No property assigned</p>
				{/if}
			</section>

			<!-- Timestamps -->
			<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
				<h2 class="flex items-center gap-2 font-display text-base font-semibold">
					<Calendar class="h-4 w-4 text-muted-foreground" />
					Timestamps
				</h2>
				<dl class="mt-4 space-y-2">
					<div>
						<dt class="kicker">Created</dt>
						<dd class="text-sm text-muted-foreground">{formatDate(a.createdat)}</dd>
					</div>
					{#if a.updatedat}
						<div>
							<dt class="kicker">Last updated</dt>
							<dd class="text-sm text-muted-foreground">{formatDate(a.updatedat)}</dd>
						</div>
					{/if}
				</dl>
			</section>
		</div>
	</div>
</div>
