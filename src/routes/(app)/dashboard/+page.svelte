<script>
	import {
		Wallet,
		AlertTriangle,
		Clock,
		TrendingUp,
		Receipt,
		FileText,
		ChevronRight,
		Building2,
		Users,
		Crown,
		Calendar,
		Inbox
	} from 'lucide-svelte';

	let { data } = $props();

	// formatters
	const fmtMoney = (n) =>
		'Rs. ' +
		new Intl.NumberFormat('en-LK', { maximumFractionDigits: 0 }).format(Number(n) || 0);
	const fmtPct = (r) => (r == null ? '—' : (r * 100).toFixed(1) + '%');
	const fmtDate = (d) =>
		d
			? new Date(d).toLocaleDateString('en-GB', {
					day: '2-digit',
					month: 'short',
					year: 'numeric'
				})
			: '—';
	const fmtRelative = (d) => {
		if (!d) return '—';
		const diffMs = new Date(d).getTime() - Date.now();
		const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
		if (diffDays === 0) return 'today';
		if (diffDays === -1) return 'yesterday';
		if (diffDays < 0) return `${-diffDays} days ago`;
		if (diffDays === 1) return 'tomorrow';
		return `in ${diffDays} days`;
	};

	// Triage tiles — one click goes to the workshop where you act on these.
	const triageTiles = $derived([
		{
			label: 'Overdue',
			count: data.triage.overdueCount,
			meta: fmtMoney(data.triage.overdueAmount),
			icon: AlertTriangle,
			tone: 'destructive',
			href: '/manager?focus=overdue'
		},
		{
			label: 'Expiring < 30d',
			count: data.triage.expiring30,
			meta: 'agreements',
			icon: Clock,
			tone: 'warning',
			href: '/manager?focus=expiring-30'
		},
		{
			label: 'Expiring < 60d',
			count: data.triage.expiring60,
			meta: 'agreements',
			icon: Calendar,
			tone: 'accent',
			href: '/manager?focus=expiring-60'
		},
		{
			label: 'Expiring < 90d',
			count: data.triage.expiring90,
			meta: 'agreements',
			icon: Calendar,
			tone: 'primary',
			href: '/manager?focus=expiring-90'
		}
	]);

	const monthLabel = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
</script>

<svelte:head>
	<title>Dashboard — KH Rentals</title>
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="kicker">Cockpit</p>
			<h1 class="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
				Dashboard
			</h1>
			<p class="mt-1 max-w-xl text-sm text-muted-foreground">
				Step back and check on things. Click any tile to act in the
				<a href="/manager" class="font-medium text-foreground underline-offset-4 hover:underline"
					>workshop</a
				>.
			</p>
		</div>
		<a
			href="/manager"
			class="inline-flex items-center gap-2 self-start rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
		>
			<Crown class="h-4 w-4" />
			Open ledger
		</a>
	</header>

	<!-- Financial pulse -->
	<section class="space-y-3">
		<div class="flex items-end justify-between">
			<div>
				<p class="kicker">Financial pulse</p>
				<h2 class="mt-1 font-display text-xl font-semibold tracking-tight">
					{monthLabel}
				</h2>
			</div>
			<p class="text-xs text-muted-foreground">
				{data.financial.count}
				{data.financial.count === 1 ? 'invoice' : 'invoices'} this month
			</p>
		</div>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<a
				href="/manager"
				class="rounded-2xl border border-border bg-card p-5 glow-primary transition-all duration-400 ease-smooth hover:-translate-y-1"
			>
				<div class="flex items-center gap-3">
					<div class="rounded-xl bg-primary p-2.5 text-primary-foreground">
						<Wallet class="h-5 w-5" />
					</div>
					<p class="kicker">Billed</p>
				</div>
				<p class="mt-3 font-mono text-3xl font-semibold tracking-tight">
					{fmtMoney(data.financial.billed)}
				</p>
			</a>
			<a
				href="/manager"
				class="rounded-2xl border border-border bg-card p-5 glow-primary transition-all duration-400 ease-smooth hover:-translate-y-1"
			>
				<div class="flex items-center gap-3">
					<div class="rounded-xl bg-success p-2.5 text-success-foreground">
						<TrendingUp class="h-5 w-5" />
					</div>
					<p class="kicker">Collected</p>
				</div>
				<p class="mt-3 font-mono text-3xl font-semibold tracking-tight text-success">
					{fmtMoney(data.financial.collected)}
				</p>
			</a>
			<a
				href="/manager"
				class="rounded-2xl border border-border bg-card p-5 glow-primary transition-all duration-400 ease-smooth hover:-translate-y-1"
			>
				<div class="flex items-center gap-3">
					<div class="rounded-xl bg-accent p-2.5 text-accent-foreground">
						<TrendingUp class="h-5 w-5" />
					</div>
					<p class="kicker">Collection rate</p>
				</div>
				<p class="mt-3 font-mono text-3xl font-semibold tracking-tight">
					{fmtPct(data.financial.rate)}
				</p>
			</a>
			<a
				href="/manager?focus=overdue"
				class="rounded-2xl border border-border bg-card p-5 glow-primary transition-all duration-400 ease-smooth hover:-translate-y-1"
			>
				<div class="flex items-center gap-3">
					<div class="rounded-xl bg-destructive p-2.5 text-destructive-foreground">
						<AlertTriangle class="h-5 w-5" />
					</div>
					<p class="kicker">Outstanding</p>
				</div>
				<p
					class="mt-3 font-mono text-3xl font-semibold tracking-tight {data.financial
						.outstanding > 0
						? 'text-destructive'
						: ''}"
				>
					{fmtMoney(data.financial.outstanding)}
				</p>
			</a>
		</div>
	</section>

	<!-- Needs attention -->
	<section class="space-y-3">
		<div>
			<p class="kicker">Needs attention</p>
			<h2 class="mt-1 font-display text-xl font-semibold tracking-tight">Triage</h2>
		</div>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each triageTiles as tile}
				<a
					href={tile.href}
					class="group rounded-2xl border border-border bg-card p-5 glow-primary transition-all duration-400 ease-smooth hover:-translate-y-1"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="flex items-center gap-3">
							{#if tile.tone === 'destructive'}
								<div class="rounded-xl bg-destructive/15 p-2 text-destructive">
									<svelte:component this={tile.icon} class="h-5 w-5" />
								</div>
							{:else if tile.tone === 'warning'}
								<div
									class="rounded-xl bg-warning/20 p-2 text-warning-foreground dark:bg-warning/15 dark:text-warning"
								>
									<svelte:component this={tile.icon} class="h-5 w-5" />
								</div>
							{:else if tile.tone === 'accent'}
								<div class="rounded-xl bg-accent/15 p-2 text-accent">
									<svelte:component this={tile.icon} class="h-5 w-5" />
								</div>
							{:else}
								<div class="rounded-xl bg-primary/15 p-2 text-primary">
									<svelte:component this={tile.icon} class="h-5 w-5" />
								</div>
							{/if}
							<p class="kicker">{tile.label}</p>
						</div>
						<ChevronRight
							class="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ease-smooth group-hover:translate-x-0.5 group-hover:text-foreground"
						/>
					</div>
					<p class="mt-3 font-mono text-3xl font-semibold tracking-tight">
						{tile.count}
					</p>
					<p class="mt-1 text-xs text-muted-foreground">{tile.meta}</p>
				</a>
			{/each}
		</div>
	</section>

	<!-- Top overdue + Recent activity grid -->
	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Top overdue invoices -->
		<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
			<header class="flex items-center justify-between border-b border-dashed border-border/60 pb-3">
				<div class="flex items-center gap-2">
					<Receipt class="h-4 w-4 text-muted-foreground" />
					<h3 class="font-display text-base font-semibold">Top overdue</h3>
					<span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
						{data.topOverdue.length}
					</span>
				</div>
				<a
					href="/manager?focus=overdue"
					class="inline-flex items-center gap-1 text-xs text-muted-foreground transition-all duration-200 ease-smooth hover:text-foreground"
				>
					Open ledger <ChevronRight class="h-3 w-3" />
				</a>
			</header>

			{#if data.topOverdue.length === 0}
				<div class="py-10 text-center">
					<Inbox class="mx-auto h-6 w-6 text-muted-foreground" />
					<p class="mt-2 text-sm text-muted-foreground">No overdue invoices</p>
					<p class="text-xs text-muted-foreground">Healthy collection — nice.</p>
				</div>
			{:else}
				<ul class="divide-y divide-border">
					{#each data.topOverdue as inv}
						<li class="flex items-center justify-between py-3">
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium">
									{inv.tenant_name || 'Unassigned'}
								</p>
								<p class="truncate text-xs text-muted-foreground">
									{inv.property_name} · {inv.billingperiod || '—'}
								</p>
							</div>
							<div class="ml-3 text-right">
								<p class="font-mono text-sm">{fmtMoney(inv.totalamount)}</p>
								<span
									class="inline-flex rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive"
								>
									{inv.days_overdue}
									{inv.days_overdue === 1 ? 'day' : 'days'} overdue
								</span>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<!-- Recent activity -->
		<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
			<header class="flex items-center justify-between border-b border-dashed border-border/60 pb-3">
				<div class="flex items-center gap-2">
					<Clock class="h-4 w-4 text-muted-foreground" />
					<h3 class="font-display text-base font-semibold">Recent activity</h3>
					<span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
						last 7 days
					</span>
				</div>
			</header>

			{#if data.recent.length === 0}
				<div class="py-10 text-center">
					<Inbox class="mx-auto h-6 w-6 text-muted-foreground" />
					<p class="mt-2 text-sm text-muted-foreground">Nothing yet this week</p>
				</div>
			{:else}
				<ul class="divide-y divide-border">
					{#each data.recent as event}
						<li class="flex items-start gap-3 py-3">
							{#if event.type === 'agreement'}
								<div class="rounded-xl bg-accent/15 p-1.5 text-accent">
									<FileText class="h-4 w-4" />
								</div>
							{:else}
								<div class="rounded-xl bg-success/15 p-1.5 text-success">
									<Receipt class="h-4 w-4" />
								</div>
							{/if}
							<div class="min-w-0 flex-1">
								{#if event.type === 'agreement'}
									<p class="text-sm">
										<span class="font-medium">Agreement signed</span>
										{#if event.tenant_name}
											· <span class="text-muted-foreground">{event.tenant_name}</span>
										{/if}
									</p>
									<p class="text-xs text-muted-foreground">
										{event.property_name} · {event.subject || ''}
									</p>
								{:else}
									<p class="text-sm">
										<span class="font-medium">Payment received</span>
										{#if event.amount}
											· <span class="font-mono">{fmtMoney(event.amount)}</span>
										{/if}
									</p>
									<p class="text-xs text-muted-foreground">
										{event.tenant_name || 'Unknown'} · {event.property_name}
									</p>
								{/if}
							</div>
							<p class="flex-shrink-0 text-xs text-muted-foreground">
								{fmtRelative(event.event_at)}
							</p>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>

	<!-- Portfolio counts (smaller, at the bottom) -->
	<section class="space-y-3">
		<div>
			<p class="kicker">Portfolio</p>
			<h2 class="mt-1 font-display text-xl font-semibold tracking-tight">At a glance</h2>
		</div>
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<a
				href="/properties"
				class="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-secondary"
			>
				<div class="rounded-xl bg-secondary p-2 text-foreground">
					<Building2 class="h-4 w-4" />
				</div>
				<div>
					<p class="font-mono text-lg font-semibold">{data.counts.properties}</p>
					<p class="kicker">Properties</p>
				</div>
			</a>
			<a
				href="/tenants"
				class="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-secondary"
			>
				<div class="rounded-xl bg-secondary p-2 text-foreground">
					<Users class="h-4 w-4" />
				</div>
				<div>
					<p class="font-mono text-lg font-semibold">{data.counts.tenants}</p>
					<p class="kicker">Tenants</p>
				</div>
			</a>
			<a
				href="/agreements"
				class="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-secondary"
			>
				<div class="rounded-xl bg-secondary p-2 text-foreground">
					<FileText class="h-4 w-4" />
				</div>
				<div>
					<p class="font-mono text-lg font-semibold">{data.counts.agreements}</p>
					<p class="kicker">Active agreements</p>
				</div>
			</a>
			<a
				href="/invoices"
				class="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-secondary"
			>
				<div class="rounded-xl bg-secondary p-2 text-foreground">
					<Receipt class="h-4 w-4" />
				</div>
				<div>
					<p class="font-mono text-lg font-semibold">{data.counts.invoices}</p>
					<p class="kicker">Open invoices</p>
				</div>
			</a>
		</div>
	</section>
</div>
