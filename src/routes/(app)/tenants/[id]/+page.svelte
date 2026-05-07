<script>
	import {
		ArrowLeft,
		Pencil,
		Mail,
		Phone,
		MapPin,
		CreditCard,
		FileText,
		Receipt
	} from 'lucide-svelte';
	import { formatCurrency } from '$lib/format/money.js';

	let { data } = $props();

	const tenant = $derived(data.tenant);

	const phone = $derived(() => {
		const cd = tenant.contact_details;
		if (!cd) return null;
		if (typeof cd === 'string') {
			try {
				return JSON.parse(cd)?.phone || null;
			} catch {
				return null;
			}
		}
		return cd?.phone || null;
	});

	const formatDate = (d) => {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('en-GB', {
			year: 'numeric',
			month: 'short',
			day: '2-digit'
		});
	};

	const statusBadgeClass = (status) => {
		const s = (status || '').toLowerCase();
		if (s === 'active' || s === 'paid' || s === 'signed')
			return 'bg-success/15 text-success';
		if (s === 'pending' || s === 'draft')
			return 'bg-warning/20 text-warning-foreground dark:bg-warning/15 dark:text-warning';
		if (s === 'overdue' || s === 'cancelled' || s === 'expired')
			return 'bg-destructive/15 text-destructive';
		return 'bg-muted text-muted-foreground';
	};
</script>

<svelte:head>
	<title>{tenant.name || 'Tenant'} — KH Rentals</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div class="flex items-start gap-3">
			<a
				href="/tenants"
				class="rounded-2xl border border-border bg-card p-2.5 text-muted-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:text-foreground"
				aria-label="Back to tenants"
			>
				<ArrowLeft class="h-4 w-4" />
			</a>
			<div>
				<p class="kicker">Tenant</p>
				<h1 class="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
					{tenant.name || 'Unnamed tenant'}
				</h1>
				<p class="mt-0.5 text-xs text-muted-foreground">Added {formatDate(tenant.createdat)}</p>
			</div>
		</div>
		<a
			href="/tenants/{tenant.id}/edit"
			class="inline-flex items-center gap-2 self-start rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
		>
			<Pencil class="h-4 w-4" />
			Edit
		</a>
	</header>

	<!-- Info card -->
	<div class="rounded-2xl border border-border bg-card p-6 glow-primary">
		<div class="flex items-start justify-between">
			<div class="flex items-center gap-4">
				<div
					class="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-xl font-semibold text-primary"
				>
					{(tenant.name || '?').charAt(0).toUpperCase()}
				</div>
				<div>
					<h2 class="font-display text-lg font-semibold">{tenant.name || 'Unnamed'}</h2>
					{#if tenant.active}
						<span class="inline-flex rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
							Active
						</span>
					{:else}
						<span class="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
							Inactive
						</span>
					{/if}
				</div>
			</div>
		</div>

		<dl class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#if tenant.email}
				<div>
					<dt class="kicker mb-1 flex items-center gap-1.5">
						<Mail class="h-3 w-3" /> Email
					</dt>
					<dd class="break-all text-sm">{tenant.email}</dd>
				</div>
			{/if}
			{#if phone()}
				<div>
					<dt class="kicker mb-1 flex items-center gap-1.5">
						<Phone class="h-3 w-3" /> Phone
					</dt>
					<dd class="font-mono text-sm">{phone()}</dd>
				</div>
			{/if}
			{#if tenant.permanent_address}
				<div>
					<dt class="kicker mb-1 flex items-center gap-1.5">
						<MapPin class="h-3 w-3" /> Address
					</dt>
					<dd class="text-sm">{tenant.permanent_address}</dd>
				</div>
			{/if}
			{#if tenant.national_id}
				<div>
					<dt class="kicker mb-1 flex items-center gap-1.5">
						<CreditCard class="h-3 w-3" /> National ID
					</dt>
					<dd class="font-mono text-sm">{tenant.national_id}</dd>
				</div>
			{/if}
		</dl>

		{#if tenant.notes}
			<div class="mt-4 rounded-xl bg-secondary/50 p-4">
				<p class="kicker mb-1">Notes</p>
				<p class="whitespace-pre-wrap text-sm">{tenant.notes}</p>
			</div>
		{/if}
	</div>

	<!-- Agreements -->
	<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
		<header class="flex items-center justify-between border-b border-dashed border-border/60 pb-3">
			<div class="flex items-center gap-2">
				<FileText class="h-4 w-4 text-muted-foreground" />
				<h2 class="font-display text-base font-semibold">Agreements</h2>
				<span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
					{data.agreements.length}
				</span>
			</div>
		</header>

		{#if data.agreements.length > 0}
			<div class="mt-2 overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
							<th class="py-3 pr-4">Title</th>
							<th class="py-3 pr-4">Property</th>
							<th class="py-3 pr-4">Period</th>
							<th class="py-3 pr-4">Rent</th>
							<th class="py-3">Status</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each data.agreements as agreement}
							<tr class="transition-colors hover:bg-secondary/40">
								<td class="py-3 pr-4">
									<a
										href="/agreements/{agreement.id}"
										class="font-medium text-foreground transition-colors hover:text-primary"
									>
										{agreement.title || 'Untitled'}
									</a>
								</td>
								<td class="py-3 pr-4 text-muted-foreground">{agreement.property_name || '—'}</td>
								<td class="py-3 pr-4 text-muted-foreground">
									{formatDate(agreement.startdate)} — {formatDate(agreement.enddate)}
								</td>
								<td class="py-3 pr-4 font-mono">
									{formatCurrency(agreement.rentamount, agreement.currency)}
								</td>
								<td class="py-3">
									<span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize {statusBadgeClass(agreement.status)}">
										{agreement.status || '—'}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="py-6 text-center text-sm text-muted-foreground">
				No agreements found for this tenant.
			</p>
		{/if}
	</section>

	<!-- Invoices -->
	<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
		<header class="flex items-center justify-between border-b border-dashed border-border/60 pb-3">
			<div class="flex items-center gap-2">
				<Receipt class="h-4 w-4 text-muted-foreground" />
				<h2 class="font-display text-base font-semibold">Recent invoices</h2>
				<span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
					{data.invoices.length}
				</span>
			</div>
		</header>

		{#if data.invoices.length > 0}
			<div class="mt-2 overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
							<th class="py-3 pr-4">Period</th>
							<th class="py-3 pr-4">Property</th>
							<th class="py-3 pr-4">Amount</th>
							<th class="py-3 pr-4">Due</th>
							<th class="py-3">Status</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each data.invoices as invoice}
							<tr class="transition-colors hover:bg-secondary/40">
								<td class="py-3 pr-4">
									<a
										href="/invoices/{invoice.id}"
										class="font-medium text-foreground transition-colors hover:text-primary"
									>
										{invoice.billingperiod || '—'}
									</a>
								</td>
								<td class="py-3 pr-4 text-muted-foreground">{invoice.property_name || '—'}</td>
								<td class="py-3 pr-4 font-mono">
									{formatCurrency(invoice.totalamount, invoice.currency)}
								</td>
								<td class="py-3 pr-4 text-muted-foreground">{formatDate(invoice.duedate)}</td>
								<td class="py-3">
									<span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize {statusBadgeClass(invoice.status)}">
										{invoice.status || '—'}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="py-6 text-center text-sm text-muted-foreground">
				No invoices found for this tenant.
			</p>
		{/if}
	</section>
</div>
