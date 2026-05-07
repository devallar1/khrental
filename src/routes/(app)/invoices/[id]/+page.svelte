<script>
	import { enhance } from '$app/forms';
	import {
		ArrowLeft,
		Receipt,
		Calendar,
		User,
		Building2,
		CreditCard,
		FileText,
		RefreshCw,
		Printer,
		Copy,
		Check,
		Lock,
		Unlock,
		Pencil,
		History,
		AlertTriangle
	} from 'lucide-svelte';
	import { formatCurrency } from '$lib/format/money.js';
	import { resolveInvoiceSenderName } from '$lib/format/invoiceSender.js';

	let { data } = $props();

	const invoice = $derived(data.invoice);
	const auditLog = $derived(data.auditLog || []);
	const erpnextConfigured = $derived(data.erpnextConfigured);
	const isDraft = $derived(invoice.status === 'draft');
	const isLocked = $derived(invoice.status === 'locked');

	let syncLoading = $state(false);
	let syncResult = $state(null);
	let copyState = $state('idle');
	let lockSubmitting = $state(false);

	function onLockSubmit() {
		lockSubmitting = true;
		return async ({ update }) => {
			lockSubmitting = false;
			await update();
		};
	}

	async function syncToErpNext() {
		syncLoading = true;
		syncResult = null;
		try {
			const res = await fetch('/api/erpnext/sync-invoice', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ invoiceId: invoice.id })
			});
			const json = await res.json();
			if (json.success) {
				syncResult = { type: 'success', message: `Synced as ${json.erpnextInvoice}` };
			} else {
				syncResult = { type: 'error', message: json.error || 'Sync failed' };
			}
		} catch (err) {
			syncResult = { type: 'error', message: err.message || 'Network error' };
		} finally {
			syncLoading = false;
		}
	}

	function buildInvoiceText() {
		const lines = [];
		const dash = '—';
		const dateOnly = (s) => {
			if (!s) return dash;
			return new Date(s).toLocaleDateString('en-GB', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
		};

		lines.push(`INVOICE ${dash} ${invoice.billingperiod || ''}`.trim());
		const sender = resolveInvoiceSenderName(invoice);
		if (sender) lines.push(sender);
		lines.push('');

		const toLines = [`To: ${invoice.tenant_name || dash}`];
		if (invoice.tenant_email) toLines.push(`    ${invoice.tenant_email}`);
		if (invoice.tenant_phone) toLines.push(`    ${invoice.tenant_phone}`);
		lines.push(...toLines);

		if (invoice.property_name || invoice.property_address) {
			lines.push(`Property: ${invoice.property_name || dash}`);
			if (invoice.property_address) lines.push(`          ${invoice.property_address}`);
		}
		lines.push('');

		lines.push(`Issue date: ${dateOnly(invoice.createdat)}`);
		lines.push(`Due date:   ${dateOnly(invoice.duedate)}`);
		lines.push('');

		const items = components();
		if (items.length > 0) {
			lines.push('Line items:');
			for (const c of items) {
				const desc = c.description || c.name || dash;
				lines.push(`  • ${desc} ${dash} ${formatCurrency(c.amount, invoice.currency)}`);
			}
			lines.push('');
		}

		lines.push(`Total: ${formatCurrency(invoice.totalamount, invoice.currency)}`);

		if (invoice.notes) {
			lines.push('');
			lines.push('Notes:');
			lines.push(invoice.notes);
		}

		return lines.join('\n');
	}

	async function copyAsText() {
		try {
			await navigator.clipboard.writeText(buildInvoiceText());
			copyState = 'copied';
			setTimeout(() => {
				copyState = 'idle';
			}, 2000);
		} catch {
			copyState = 'error';
			setTimeout(() => {
				copyState = 'idle';
			}, 2000);
		}
	}

	const components = $derived(() => {
		if (!invoice.components) return [];
		if (typeof invoice.components === 'string') {
			try {
				return JSON.parse(invoice.components);
			} catch {
				return [];
			}
		}
		return Array.isArray(invoice.components) ? invoice.components : [];
	});

	const formatDate = (dateStr) => {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-GB', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	};

	const formatDateTime = (dateStr) => {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleString('en-GB', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	};

	const statusBadgeClass = (status) => {
		switch (status) {
			case 'paid':
				return 'inline-flex items-center rounded-full bg-success/15 px-3 py-1 text-sm font-medium capitalize text-success';
			case 'locked':
			case 'pending':
				return 'inline-flex items-center rounded-full bg-warning/20 px-3 py-1 text-sm font-medium capitalize text-warning-foreground dark:bg-warning/15 dark:text-warning';
			case 'overdue':
				return 'inline-flex items-center rounded-full bg-destructive/15 px-3 py-1 text-sm font-medium capitalize text-destructive';
			case 'draft':
				return 'inline-flex items-center rounded-full bg-primary/15 px-3 py-1 text-sm font-medium capitalize text-primary';
			case 'cancelled':
				return 'inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-medium capitalize text-muted-foreground';
			default:
				return 'inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-medium capitalize text-muted-foreground';
		}
	};

	const auditLabel = (action) => {
		switch (action) {
			case 'created':
				return 'Created (draft)';
			case 'edited':
				return 'Edited';
			case 'locked':
				return 'Locked';
			case 'unlocked':
				return 'Unlocked';
			case 'deleted':
				return 'Deleted';
			default:
				return action;
		}
	};
</script>

<svelte:head>
	<title>Invoice — {invoice.billingperiod || 'Detail'} — KH Rentals</title>
</svelte:head>

<div class="space-y-6">
	<!-- Back + actions row -->
	<div class="flex flex-wrap items-center gap-3">
		<a
			href="/invoices"
			class="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
		>
			<ArrowLeft class="h-4 w-4" />
			Back to invoices
		</a>

		{#if isDraft}
			<a
				href="/invoices/{invoice.id}/edit"
				class="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-primary to-accent px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
			>
				<Pencil class="h-3.5 w-3.5" />
				Edit
			</a>
			<form method="POST" action="?/lock" use:enhance={onLockSubmit} class="inline">
				<button
					type="submit"
					disabled={lockSubmitting}
					class="inline-flex items-center gap-1.5 rounded-2xl bg-success px-3 py-1.5 text-sm font-semibold text-success-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
				>
					<Lock class="h-3.5 w-3.5" />
					{lockSubmitting ? 'Locking…' : 'Lock invoice'}
				</button>
			</form>
		{:else}
			<a
				href="/invoices/{invoice.id}/print"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-primary to-accent px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
			>
				<Printer class="h-3.5 w-3.5" />
				Print / PDF
			</a>

			<button
				onclick={copyAsText}
				class="inline-flex items-center gap-1.5 rounded-2xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-secondary"
			>
				{#if copyState === 'copied'}
					<Check class="h-3.5 w-3.5 text-success" />
					<span class="text-success">Copied</span>
				{:else if copyState === 'error'}
					<Copy class="h-3.5 w-3.5" />
					<span class="text-destructive">Copy failed</span>
				{:else}
					<Copy class="h-3.5 w-3.5" />
					Copy as text
				{/if}
			</button>

			{#if isLocked}
				<form method="POST" action="?/unlock" use:enhance={onLockSubmit} class="inline">
					<button
						type="submit"
						disabled={lockSubmitting}
						class="inline-flex items-center gap-1.5 rounded-2xl border border-warning/30 bg-card px-3 py-1.5 text-sm font-medium text-warning-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-warning/10 dark:text-warning disabled:opacity-50"
					>
						<Unlock class="h-3.5 w-3.5" />
						{lockSubmitting ? 'Unlocking…' : 'Unlock to edit'}
					</button>
				</form>
			{/if}
		{/if}

		{#if erpnextConfigured && !isDraft}
			<button
				onclick={syncToErpNext}
				disabled={syncLoading}
				class="inline-flex items-center gap-1.5 rounded-2xl bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<RefreshCw class="h-3.5 w-3.5 {syncLoading ? 'animate-spin' : ''}" />
				{syncLoading ? 'Syncing…' : 'Sync to ERPNext'}
			</button>
			{#if syncResult}
				<span class="text-sm {syncResult.type === 'success' ? 'text-success' : 'text-destructive'}">
					{syncResult.message}
				</span>
			{/if}
		{/if}
	</div>

	{#if isDraft}
		<div class="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4">
			<AlertTriangle class="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
			<div class="text-sm">
				<p class="font-semibold">Draft invoice</p>
				<p class="mt-0.5 text-muted-foreground">
					This invoice is editable and cannot be printed. Lock it when you're satisfied —
					locked invoices can be printed and shared, and any later edits are recorded in the
					audit log.
				</p>
			</div>
		</div>
	{/if}

	<!-- Header -->
	<header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="kicker">Invoice</p>
			<h1 class="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
				{invoice.billingperiod || '—'}
			</h1>
			<p class="mt-0.5 text-xs text-muted-foreground">
				Created {formatDateTime(invoice.createdat)}
			</p>
		</div>
		<span class={statusBadgeClass(invoice.status)}>
			{invoice.status || 'unknown'}
		</span>
	</header>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Main content -->
		<div class="space-y-6 lg:col-span-2">
			<!-- Tenant + property + dates -->
			<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
				<h2 class="font-display text-base font-semibold">Details</h2>
				<dl class="mt-4 grid gap-4 sm:grid-cols-2">
					<div class="flex items-start gap-3">
						<div class="rounded-xl bg-primary/15 p-2.5 text-primary">
							<User class="h-5 w-5" />
						</div>
						<div>
							<dt class="kicker">Tenant</dt>
							<dd class="mt-0.5 text-sm font-medium">{invoice.tenant_name || '—'}</dd>
							{#if invoice.tenant_email}
								<p class="text-xs text-muted-foreground">{invoice.tenant_email}</p>
							{/if}
							{#if invoice.tenant_phone}
								<p class="font-mono text-xs text-muted-foreground">{invoice.tenant_phone}</p>
							{/if}
						</div>
					</div>
					<div class="flex items-start gap-3">
						<div class="rounded-xl bg-accent/15 p-2.5 text-accent">
							<Building2 class="h-5 w-5" />
						</div>
						<div>
							<dt class="kicker">Property</dt>
							<dd class="mt-0.5 text-sm font-medium">{invoice.property_name || '—'}</dd>
							{#if invoice.property_address}
								<p class="text-xs text-muted-foreground">{invoice.property_address}</p>
							{/if}
						</div>
					</div>
					<div class="flex items-start gap-3">
						<div class="rounded-xl bg-warning/20 p-2.5 text-warning-foreground dark:bg-warning/15 dark:text-warning">
							<Calendar class="h-5 w-5" />
						</div>
						<div>
							<dt class="kicker">Due date</dt>
							<dd class="mt-0.5 text-sm font-medium">{formatDate(invoice.duedate)}</dd>
						</div>
					</div>
					<div class="flex items-start gap-3">
						<div class="rounded-xl bg-success/15 p-2.5 text-success">
							<Receipt class="h-5 w-5" />
						</div>
						<div>
							<dt class="kicker">Billing period</dt>
							<dd class="mt-0.5 text-sm font-medium">{invoice.billingperiod || '—'}</dd>
						</div>
					</div>
				</dl>
			</section>

			<!-- Line items -->
			<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
				<h2 class="font-display text-base font-semibold">Line items</h2>
				{#if components().length > 0}
					<div class="mt-4 overflow-hidden rounded-xl border border-border">
						<table class="min-w-full divide-y divide-border">
							<thead class="bg-secondary/50">
								<tr>
									<th class="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
										>Description</th
									>
									<th class="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
										>Amount</th
									>
								</tr>
							</thead>
							<tbody class="divide-y divide-border">
								{#each components() as comp}
									<tr>
										<td class="px-4 py-3 text-sm">
											{comp.description || comp.name || '—'}
										</td>
										<td class="px-4 py-3 text-right font-mono text-sm font-medium">
											{formatCurrency(comp.amount, invoice.currency)}
										</td>
									</tr>
								{/each}
							</tbody>
							<tfoot class="bg-secondary/50">
								<tr>
									<td class="px-4 py-3 text-sm font-semibold">Total</td>
									<td class="px-4 py-3 text-right font-mono text-base font-bold">
										{formatCurrency(invoice.totalamount, invoice.currency)}
									</td>
								</tr>
							</tfoot>
						</table>
					</div>
				{:else}
					<div class="mt-4 rounded-xl border border-dashed border-border p-6 text-center">
						<p class="text-sm text-muted-foreground">No line items recorded.</p>
						<p class="mt-1 font-mono text-lg font-bold">
							Total: {formatCurrency(invoice.totalamount, invoice.currency)}
						</p>
					</div>
				{/if}
			</section>

			<!-- Notes -->
			{#if invoice.notes}
				<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
					<div class="flex items-center gap-2">
						<FileText class="h-4 w-4 text-muted-foreground" />
						<h2 class="font-display text-base font-semibold">Notes</h2>
					</div>
					<p class="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{invoice.notes}</p>
				</section>
			{/if}

			<!-- Audit log -->
			{#if auditLog.length > 0}
				<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
					<div class="flex items-center gap-2">
						<History class="h-4 w-4 text-muted-foreground" />
						<h2 class="font-display text-base font-semibold">Audit log</h2>
					</div>
					<ul class="mt-4 divide-y divide-border">
						{#each auditLog as entry}
							<li class="flex items-start justify-between py-3 first:pt-0 last:pb-0">
								<div>
									<p class="text-sm font-medium">{auditLabel(entry.action)}</p>
									<p class="text-xs text-muted-foreground">
										{entry.user_name || entry.user_email || 'system'}
									</p>
								</div>
								<p class="whitespace-nowrap text-xs text-muted-foreground">
									{formatDateTime(entry.created_at)}
								</p>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Amount card -->
			<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
				<p class="kicker">Total amount</p>
				<p class="mt-2 font-mono text-3xl font-bold tracking-tight">
					{formatCurrency(invoice.totalamount, invoice.currency)}
				</p>
				<div class="mt-3">
					<span class={statusBadgeClass(invoice.status)}>
						{invoice.status || 'unknown'}
					</span>
				</div>
			</section>

			<!-- Payment info -->
			{#if invoice.status === 'paid' || invoice.paymentdate || invoice.paymentproofurl}
				<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
					<div class="flex items-center gap-2">
						<CreditCard class="h-4 w-4 text-success" />
						<h2 class="font-display text-base font-semibold">Payment</h2>
					</div>
					{#if invoice.paymentdate}
						<div class="mt-3">
							<p class="kicker">Payment date</p>
							<p class="mt-0.5 text-sm font-medium">{formatDateTime(invoice.paymentdate)}</p>
						</div>
					{/if}
					{#if invoice.paymentproofurl}
						<div class="mt-3">
							<p class="kicker">Proof of payment</p>
							<a
								href={invoice.paymentproofurl}
								target="_blank"
								rel="noopener noreferrer"
								class="mt-0.5 inline-block text-sm font-medium text-primary transition-colors hover:underline"
							>
								View proof
							</a>
						</div>
					{/if}
				</section>
			{/if}

			<!-- Timestamps -->
			<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
				<h2 class="font-display text-sm font-semibold">Timestamps</h2>
				<dl class="mt-3 space-y-2 text-xs text-muted-foreground">
					<div class="flex justify-between">
						<dt>Created</dt>
						<dd>{formatDateTime(invoice.createdat)}</dd>
					</div>
					{#if invoice.updatedat}
						<div class="flex justify-between">
							<dt>Updated</dt>
							<dd>{formatDateTime(invoice.updatedat)}</dd>
						</div>
					{/if}
				</dl>
			</section>
		</div>
	</div>
</div>
