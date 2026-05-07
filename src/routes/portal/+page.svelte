<script>
	import {
		Mail,
		Phone,
		MapPin,
		IdCard,
		Building2,
		Check,
		AlertCircle,
		Receipt,
		FileText,
		Wallet,
		Calendar,
		ChevronRight,
		HelpCircle
	} from 'lucide-svelte';

	let { data } = $props();
	const profile = $derived(data.profile);
	const agreement = $derived(data.agreement);
	const currentInvoice = $derived(data.currentInvoice);
	const recentInvoices = $derived(data.recentInvoices || []);
	const properties = $derived(data.properties || []);

	const fmtMoney = (n, currency = 'LKR') => {
		const symbol = currency === 'LKR' ? 'Rs.' : currency;
		return `${symbol} ${new Intl.NumberFormat('en-LK', { maximumFractionDigits: 0 }).format(Number(n) || 0)}`;
	};
	const fmtDate = (d) =>
		d
			? new Date(d).toLocaleDateString('en-GB', {
					day: '2-digit',
					month: 'short',
					year: 'numeric'
				})
			: '—';
	const daysBetween = (from, to) => {
		if (!from || !to) return null;
		return Math.round((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24));
	};

	const agreementDaysLeft = $derived(
		agreement?.enddate ? daysBetween(new Date(), agreement.enddate) : null
	);

	const invoiceStatus = $derived.by(() => {
		if (!currentInvoice) return null;
		const days = currentInvoice.days_until_due;
		if (days == null) return { label: 'Pending', tone: 'warning' };
		if (days > 0) return { label: `${days} ${days === 1 ? 'day' : 'days'} overdue`, tone: 'destructive' };
		if (days === 0) return { label: 'Due today', tone: 'warning' };
		return { label: `Due in ${-days} ${-days === 1 ? 'day' : 'days'}`, tone: 'accent' };
	});

	const recentStatusClass = (s) => {
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
	<title>My account — KH Rentals</title>
</svelte:head>

<div class="space-y-8">
	<!-- Hero — my place + agreement -->
	<header>
		<p class="kicker">Welcome back</p>
		<h1 class="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
			{profile.name || 'Tenant'}
		</h1>
		<p class="mt-1 text-sm text-muted-foreground">Your home, your bills, your details — all here.</p>
	</header>

	{#if agreement}
		<section
			class="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-6 glow-primary-strong"
		>
			<div class="flex flex-wrap items-start justify-between gap-6">
				<div class="min-w-0 flex-1">
					<p class="kicker">Your home</p>
					<h2 class="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
						{agreement.property_name || 'Property'}
					</h2>
					{#if agreement.unit_number || agreement.unit_floor}
						<p class="mt-1 text-sm">
							{#if agreement.unit_number}Unit {agreement.unit_number}{/if}
							{#if agreement.unit_floor}
								{agreement.unit_number ? ' · ' : ''}Floor {agreement.unit_floor}
							{/if}
						</p>
					{/if}
					{#if agreement.property_address}
						<p class="mt-1 text-sm text-muted-foreground">{agreement.property_address}</p>
					{/if}
				</div>
				<div class="text-right">
					<p class="kicker">Rent</p>
					<p class="mt-1 font-mono text-2xl font-semibold tracking-tight">
						{fmtMoney(agreement.rentamount, agreement.currency)}
					</p>
					<p class="text-xs text-muted-foreground">/ month</p>
				</div>
			</div>

			<div class="mt-6 grid gap-4 border-t border-border/60 pt-4 sm:grid-cols-3">
				<div>
					<p class="kicker">Started</p>
					<p class="mt-1 text-sm">{fmtDate(agreement.startdate)}</p>
				</div>
				<div>
					<p class="kicker">Ends</p>
					<p class="mt-1 text-sm">
						{fmtDate(agreement.enddate)}
						{#if agreementDaysLeft !== null && agreementDaysLeft > 0 && agreementDaysLeft <= 60}
							<span class="ml-1 rounded-full bg-warning/20 px-1.5 py-0.5 text-[10px] font-medium text-warning-foreground dark:bg-warning/15 dark:text-warning">
								{agreementDaysLeft} {agreementDaysLeft === 1 ? 'day' : 'days'} left
							</span>
						{/if}
					</p>
				</div>
				<div class="sm:text-right">
					<a
						href="/portal/contract"
						class="inline-flex items-center gap-1 text-sm font-medium text-foreground transition-all duration-200 ease-smooth hover:text-primary"
					>
						View agreement <ChevronRight class="h-3 w-3" />
					</a>
				</div>
			</div>
		</section>
	{:else}
		<section class="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
			<Building2 class="mx-auto h-8 w-8 text-muted-foreground" />
			<p class="mt-3 text-sm font-medium">No active agreement on file</p>
			<p class="mt-1 text-xs text-muted-foreground">
				Once your manager sets you up, your home and rent details show up here.
			</p>
		</section>
	{/if}

	<!-- Current invoice + recent invoices grid -->
	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Current bill -->
		<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
			<header class="flex items-center justify-between border-b border-dashed border-border/60 pb-3">
				<div class="flex items-center gap-2">
					<Wallet class="h-4 w-4 text-muted-foreground" />
					<h3 class="font-display text-base font-semibold">Current bill</h3>
				</div>
				<a
					href="/portal/invoices"
					class="inline-flex items-center gap-1 text-xs text-muted-foreground transition-all duration-200 ease-smooth hover:text-foreground"
				>
					All invoices <ChevronRight class="h-3 w-3" />
				</a>
			</header>

			{#if currentInvoice}
				<div class="mt-4 space-y-4">
					<div class="flex items-baseline justify-between">
						<div>
							<p class="kicker">{currentInvoice.billingperiod || 'Period'}</p>
							{#if currentInvoice.property_name}
								<p class="mt-0.5 text-xs text-muted-foreground">{currentInvoice.property_name}</p>
							{/if}
						</div>
						<p class="font-mono text-3xl font-semibold tracking-tight">
							{fmtMoney(currentInvoice.totalamount, currentInvoice.currency)}
						</p>
					</div>

					<div class="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
						<div class="flex items-center gap-2 text-xs">
							<Calendar class="h-3 w-3 text-muted-foreground" />
							<span>Due {fmtDate(currentInvoice.duedate)}</span>
						</div>
						{#if invoiceStatus}
							{#if invoiceStatus.tone === 'destructive'}
								<span
									class="inline-flex rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive"
								>
									<AlertCircle class="mr-1 h-3 w-3" /> {invoiceStatus.label}
								</span>
							{:else if invoiceStatus.tone === 'warning'}
								<span
									class="inline-flex rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-medium text-warning-foreground dark:bg-warning/15 dark:text-warning"
								>
									{invoiceStatus.label}
								</span>
							{:else}
								<span
									class="inline-flex rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent"
								>
									{invoiceStatus.label}
								</span>
							{/if}
						{/if}
					</div>

					<a
						href="/portal/invoices"
						class="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
					>
						<Receipt class="h-4 w-4" />
						View invoice
					</a>
				</div>
			{:else}
				<div class="py-10 text-center">
					<Check class="mx-auto h-8 w-8 text-success" />
					<p class="mt-2 text-sm font-medium">All settled</p>
					<p class="text-xs text-muted-foreground">No outstanding invoices right now.</p>
				</div>
			{/if}
		</section>

		<!-- Recent invoices -->
		<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
			<header class="flex items-center justify-between border-b border-dashed border-border/60 pb-3">
				<div class="flex items-center gap-2">
					<Receipt class="h-4 w-4 text-muted-foreground" />
					<h3 class="font-display text-base font-semibold">Recent</h3>
					<span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
						{recentInvoices.length}
					</span>
				</div>
				<a
					href="/portal/invoices"
					class="inline-flex items-center gap-1 text-xs text-muted-foreground transition-all duration-200 ease-smooth hover:text-foreground"
				>
					Full history <ChevronRight class="h-3 w-3" />
				</a>
			</header>

			{#if recentInvoices.length === 0}
				<div class="py-10 text-center">
					<Receipt class="mx-auto h-6 w-6 text-muted-foreground" />
					<p class="mt-2 text-sm text-muted-foreground">No invoices yet</p>
				</div>
			{:else}
				<ul class="mt-2 divide-y divide-border">
					{#each recentInvoices as inv}
						<li class="flex items-center justify-between py-3">
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium">{inv.billingperiod || '—'}</p>
								<p class="text-xs text-muted-foreground">
									{inv.paymentdate ? `Paid ${fmtDate(inv.paymentdate)}` : `Due ${fmtDate(inv.duedate)}`}
								</p>
							</div>
							<div class="ml-3 text-right">
								<p class="font-mono text-sm">{fmtMoney(inv.totalamount, inv.currency)}</p>
								<span
									class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize {recentStatusClass(
										inv.status
									)}"
								>
									{inv.status || 'unknown'}
								</span>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>

	<!-- My account info -->
	<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
		<header class="border-b border-dashed border-border/60 pb-3">
			<div class="flex items-center gap-2">
				<IdCard class="h-4 w-4 text-muted-foreground" />
				<h3 class="font-display text-base font-semibold">My account</h3>
			</div>
		</header>
		<dl class="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
			<div>
				<dt class="kicker mb-1 flex items-center gap-1.5">
					<Mail class="h-3 w-3" /> Email
				</dt>
				<dd class="break-all text-sm">
					{profile.email || '—'}
					{#if profile.email}
						{#if profile.emailVerified}
							<span
								class="ml-2 inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success"
							>
								<Check class="h-3 w-3" /> verified
							</span>
						{:else}
							<span
								class="ml-2 inline-flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning-foreground dark:bg-warning/15 dark:text-warning"
							>
								<AlertCircle class="h-3 w-3" /> unverified
							</span>
						{/if}
					{/if}
				</dd>
			</div>

			<div>
				<dt class="kicker mb-1 flex items-center gap-1.5">
					<Phone class="h-3 w-3" /> Phone
				</dt>
				<dd class="text-sm">
					<span class="font-mono">{profile.phone || '—'}</span>
					{#if profile.phone}
						{#if profile.phoneVerified}
							<span
								class="ml-2 inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success"
							>
								<Check class="h-3 w-3" /> verified
							</span>
						{:else}
							<span
								class="ml-2 inline-flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning-foreground dark:bg-warning/15 dark:text-warning"
							>
								<AlertCircle class="h-3 w-3" /> unverified
							</span>
						{/if}
					{/if}
				</dd>
			</div>

			<div>
				<dt class="kicker mb-1 flex items-center gap-1.5">
					<IdCard class="h-3 w-3" /> National ID
				</dt>
				<dd class="font-mono text-sm">{profile.national_id || '—'}</dd>
			</div>

			<div>
				<dt class="kicker mb-1 flex items-center gap-1.5">
					<MapPin class="h-3 w-3" /> Permanent address
				</dt>
				<dd class="text-sm">{profile.permanent_address || '—'}</dd>
			</div>

			<div>
				<dt class="kicker mb-1">Member since</dt>
				<dd class="text-sm">{fmtDate(profile.memberSince)}</dd>
			</div>
		</dl>
		<p class="mt-4 text-xs text-muted-foreground">
			To change any of these details, please contact your property manager.
		</p>
	</section>

	{#if properties.length > 1}
		<!-- Multi-property tenants — show all associated properties -->
		<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
			<header class="border-b border-dashed border-border/60 pb-3">
				<div class="flex items-center gap-2">
					<Building2 class="h-4 w-4 text-muted-foreground" />
					<h3 class="font-display text-base font-semibold">Associated properties</h3>
				</div>
			</header>
			<ul class="mt-3 divide-y divide-border">
				{#each properties as prop}
					<li class="flex items-start justify-between py-3">
						<div>
							<p class="text-sm font-medium">{prop.name}</p>
							<p class="text-xs text-muted-foreground">{prop.address || ''}</p>
						</div>
						{#if prop.propertytype}
							<span class="text-xs capitalize text-muted-foreground">{prop.propertytype}</span>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- Help footer -->
	<section
		class="rounded-2xl border border-dashed border-border bg-secondary/40 p-5 text-center"
	>
		<HelpCircle class="mx-auto h-6 w-6 text-muted-foreground" />
		<p class="mt-2 text-sm font-medium">Need help?</p>
		<p class="mt-1 text-xs text-muted-foreground">
			For payment, agreement, or any account changes — please contact your property manager directly.
		</p>
	</section>
</div>
