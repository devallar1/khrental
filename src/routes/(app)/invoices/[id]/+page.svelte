<script>
	import { enhance } from '$app/forms';
	import { ArrowLeft, Receipt, Calendar, User, Building2, CreditCard, FileText, RefreshCw, Printer, Copy, Check, Lock, Unlock, Pencil, History, AlertTriangle } from 'lucide-svelte';
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
	let copyState = $state('idle'); // 'idle' | 'copied' | 'error'
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
			setTimeout(() => { copyState = 'idle'; }, 2000);
		} catch {
			copyState = 'error';
			setTimeout(() => { copyState = 'idle'; }, 2000);
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
		if (!dateStr) return '--';
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	};

	const formatDateTime = (dateStr) => {
		if (!dateStr) return '--';
		return new Date(dateStr).toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	};

	const statusBadgeClass = (status) => {
		const base = 'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium capitalize';
		switch (status) {
			case 'paid':
				return `${base} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20`;
			case 'locked':
			case 'pending':
				return `${base} bg-amber-50 text-amber-700 ring-1 ring-amber-600/20`;
			case 'overdue':
				return `${base} bg-red-50 text-red-700 ring-1 ring-red-600/20`;
			case 'draft':
				return `${base} bg-blue-50 text-blue-700 ring-1 ring-blue-600/20`;
			case 'cancelled':
				return `${base} bg-slate-50 text-slate-600 ring-1 ring-slate-500/20`;
			default:
				return `${base} bg-slate-50 text-slate-600 ring-1 ring-slate-500/20`;
		}
	};

	const auditLabel = (action) => {
		switch (action) {
			case 'created': return 'Created (draft)';
			case 'edited':  return 'Edited';
			case 'locked':  return 'Locked';
			case 'unlocked':return 'Unlocked';
			case 'deleted': return 'Deleted';
			default:        return action;
		}
	};
</script>

<svelte:head>
	<title>Invoice - {invoice.billingperiod || 'Detail'} - KH Rentals</title>
</svelte:head>

<div>
	<!-- Back button and header -->
	<div class="mb-6 flex flex-wrap items-center gap-3">
		<a
			href="/invoices"
			class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
		>
			<ArrowLeft class="h-4 w-4" />
			Back to Invoices
		</a>

		{#if isDraft}
			<a
				href="/invoices/{invoice.id}/edit"
				class="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
			>
				<Pencil class="h-3.5 w-3.5" />
				Edit
			</a>
			<form method="POST" action="?/lock" use:enhance={onLockSubmit} class="inline">
				<button
					type="submit"
					disabled={lockSubmitting}
					class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
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
				class="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
			>
				<Printer class="h-3.5 w-3.5" />
				Print / PDF
			</a>

			<button
				onclick={copyAsText}
				class="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
			>
				{#if copyState === 'copied'}
					<Check class="h-3.5 w-3.5 text-emerald-600" />
					<span class="text-emerald-700">Copied</span>
				{:else if copyState === 'error'}
					<Copy class="h-3.5 w-3.5" />
					<span class="text-red-600">Copy failed</span>
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
						class="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-amber-700 shadow-sm ring-1 ring-amber-200 transition hover:bg-amber-50 disabled:opacity-50"
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
				class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<RefreshCw class="h-3.5 w-3.5 {syncLoading ? 'animate-spin' : ''}" />
				{syncLoading ? 'Syncing...' : 'Sync to ERPNext'}
			</button>
			{#if syncResult}
				<span class="text-sm {syncResult.type === 'success' ? 'text-emerald-600' : 'text-red-600'}">
					{syncResult.message}
				</span>
			{/if}
		{/if}
	</div>

	{#if isDraft}
		<div class="mb-6 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
			<AlertTriangle class="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
			<div class="text-sm text-blue-900">
				<p class="font-semibold">Draft invoice</p>
				<p class="mt-0.5 text-blue-800">
					This invoice is editable and cannot be printed. Lock it when you're satisfied —
					locked invoices can be printed and shared, and any later edits are recorded in the audit log.
				</p>
			</div>
		</div>
	{/if}

	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">
				Invoice: {invoice.billingperiod || '--'}
			</h1>
			<p class="mt-1 text-sm text-slate-500">
				Created {formatDateTime(invoice.createdat)}
			</p>
		</div>
		<span class={statusBadgeClass(invoice.status)}>
			{invoice.status || 'unknown'}
		</span>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Main content -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Rentee and Property -->
			<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<h2 class="text-lg font-semibold text-slate-900">Details</h2>
				<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="flex items-start gap-3">
						<div class="rounded-xl bg-blue-50 p-2.5">
							<User class="h-5 w-5 text-blue-600" />
						</div>
						<div>
							<p class="text-xs font-medium uppercase tracking-wider text-slate-400">Tenant</p>
							<p class="mt-0.5 text-sm font-medium text-slate-900">{invoice.tenant_name || '--'}</p>
							<p class="text-xs text-slate-500">{invoice.tenant_email || ''}</p>
							{#if invoice.tenant_phone}
								<p class="text-xs text-slate-500">{invoice.tenant_phone}</p>
							{/if}
						</div>
					</div>
					<div class="flex items-start gap-3">
						<div class="rounded-xl bg-violet-50 p-2.5">
							<Building2 class="h-5 w-5 text-violet-600" />
						</div>
						<div>
							<p class="text-xs font-medium uppercase tracking-wider text-slate-400">Property</p>
							<p class="mt-0.5 text-sm font-medium text-slate-900">{invoice.property_name || '--'}</p>
							{#if invoice.property_address}
								<p class="text-xs text-slate-500">{invoice.property_address}</p>
							{/if}
						</div>
					</div>
					<div class="flex items-start gap-3">
						<div class="rounded-xl bg-amber-50 p-2.5">
							<Calendar class="h-5 w-5 text-amber-600" />
						</div>
						<div>
							<p class="text-xs font-medium uppercase tracking-wider text-slate-400">Due Date</p>
							<p class="mt-0.5 text-sm font-medium text-slate-900">{formatDate(invoice.duedate)}</p>
						</div>
					</div>
					<div class="flex items-start gap-3">
						<div class="rounded-xl bg-emerald-50 p-2.5">
							<Receipt class="h-5 w-5 text-emerald-600" />
						</div>
						<div>
							<p class="text-xs font-medium uppercase tracking-wider text-slate-400">Billing Period</p>
							<p class="mt-0.5 text-sm font-medium text-slate-900">{invoice.billingperiod || '--'}</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Components breakdown -->
			<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<h2 class="text-lg font-semibold text-slate-900">Line Items</h2>
				{#if components().length > 0}
					<div class="mt-4 overflow-hidden rounded-xl border border-slate-100">
						<table class="min-w-full divide-y divide-slate-100">
							<thead class="bg-slate-50">
								<tr>
									<th class="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
										Description
									</th>
									<th class="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
										Amount
									</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-50">
								{#each components() as comp}
									<tr>
										<td class="px-4 py-3 text-sm text-slate-700">
											{comp.description || comp.name || '--'}
										</td>
										<td class="px-4 py-3 text-right text-sm font-medium text-slate-900">
											{formatCurrency(comp.amount, invoice.currency)}
										</td>
									</tr>
								{/each}
							</tbody>
							<tfoot class="bg-slate-50">
								<tr>
									<td class="px-4 py-3 text-sm font-semibold text-slate-900">Total</td>
									<td class="px-4 py-3 text-right text-sm font-bold text-slate-900">
										{formatCurrency(invoice.totalamount, invoice.currency)}
									</td>
								</tr>
							</tfoot>
						</table>
					</div>
				{:else}
					<div class="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center">
						<p class="text-sm text-slate-500">No line items recorded.</p>
						<p class="mt-1 text-lg font-bold text-slate-900">Total: {formatCurrency(invoice.totalamount, invoice.currency)}</p>
					</div>
				{/if}
			</div>

			<!-- Notes -->
			{#if invoice.notes}
				<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<div class="flex items-center gap-2">
						<FileText class="h-5 w-5 text-slate-400" />
						<h2 class="text-lg font-semibold text-slate-900">Notes</h2>
					</div>
					<p class="mt-3 whitespace-pre-wrap text-sm text-slate-600">{invoice.notes}</p>
				</div>
			{/if}

			<!-- Audit log -->
			{#if auditLog.length > 0}
				<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<div class="flex items-center gap-2">
						<History class="h-5 w-5 text-slate-400" />
						<h2 class="text-lg font-semibold text-slate-900">Audit log</h2>
					</div>
					<ul class="mt-4 divide-y divide-slate-100">
						{#each auditLog as entry}
							<li class="flex items-start justify-between py-3 first:pt-0 last:pb-0">
								<div>
									<p class="text-sm font-medium text-slate-900">{auditLabel(entry.action)}</p>
									<p class="text-xs text-slate-500">
										{entry.user_name || entry.user_email || 'system'}
									</p>
								</div>
								<p class="whitespace-nowrap text-xs text-slate-500">{formatDateTime(entry.created_at)}</p>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Amount card -->
			<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<p class="text-xs font-medium uppercase tracking-wider text-slate-400">Total Amount</p>
				<p class="mt-2 text-3xl font-bold text-slate-900">{formatCurrency(invoice.totalamount, invoice.currency)}</p>
				<div class="mt-3">
					<span class={statusBadgeClass(invoice.status)}>
						{invoice.status || 'unknown'}
					</span>
				</div>
			</div>

			<!-- Payment info -->
			{#if invoice.status === 'paid' || invoice.paymentdate || invoice.paymentproofurl}
				<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<div class="flex items-center gap-2">
						<CreditCard class="h-5 w-5 text-emerald-600" />
						<h2 class="text-lg font-semibold text-slate-900">Payment</h2>
					</div>
					{#if invoice.paymentdate}
						<div class="mt-3">
							<p class="text-xs font-medium uppercase tracking-wider text-slate-400">Payment Date</p>
							<p class="mt-0.5 text-sm font-medium text-slate-900">{formatDateTime(invoice.paymentdate)}</p>
						</div>
					{/if}
					{#if invoice.paymentproofurl}
						<div class="mt-3">
							<p class="text-xs font-medium uppercase tracking-wider text-slate-400">Proof of Payment</p>
							<a
								href={invoice.paymentproofurl}
								target="_blank"
								rel="noopener noreferrer"
								class="mt-0.5 inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
							>
								View proof
							</a>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Timestamps -->
			<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<h2 class="text-sm font-semibold text-slate-900">Timestamps</h2>
				<div class="mt-3 space-y-2 text-xs text-slate-500">
					<div class="flex justify-between">
						<span>Created</span>
						<span>{formatDateTime(invoice.createdat)}</span>
					</div>
					{#if invoice.updatedat}
						<div class="flex justify-between">
							<span>Updated</span>
							<span>{formatDateTime(invoice.updatedat)}</span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
