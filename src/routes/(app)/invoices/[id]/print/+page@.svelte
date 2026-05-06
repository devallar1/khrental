<script>
	import { Printer, ArrowLeft } from 'lucide-svelte';
	import { formatCurrency } from '$lib/format/money.js';
	import { resolveInvoiceSenderName } from '$lib/format/invoiceSender.js';

	let { data } = $props();
	const invoice = $derived(data.invoice);
	const senderName = $derived(resolveInvoiceSenderName(invoice));

	const components = $derived(() => {
		if (!invoice.components) return [];
		const raw = typeof invoice.components === 'string'
			? safeParse(invoice.components)
			: invoice.components;
		return Array.isArray(raw) ? raw : [];
	});

	function safeParse(s) {
		try { return JSON.parse(s); } catch { return []; }
	}

	const invoiceShortId = $derived((invoice.id || '').slice(-8).toUpperCase());

	const formatDate = (dateStr) => {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-GB', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	};

	function doPrint() {
		window.print();
	}
</script>

<svelte:head>
	<title>Invoice {invoice.billingperiod || ''} — {invoice.org_name || 'KH Rentals'}</title>
	<style media="print">
		@page { size: A4; margin: 14mm; }
		body { background: white !important; }
		.no-print { display: none !important; }
		.invoice-sheet { box-shadow: none !important; border: none !important; padding: 0 !important; max-width: none !important; }
	</style>
</svelte:head>

<div class="min-h-screen bg-slate-100 py-8">
	<!-- Toolbar (hidden in print) -->
	<div class="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-4">
		<a
			href="/invoices/{invoice.id}"
			class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
		>
			<ArrowLeft class="h-4 w-4" />
			Back to invoice
		</a>
		<button
			onclick={doPrint}
			class="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
		>
			<Printer class="h-4 w-4" />
			Print / Save as PDF
		</button>
	</div>

	<!-- Invoice document -->
	<article class="invoice-sheet mx-auto max-w-[210mm] bg-white p-12 shadow-sm" style="min-height: 297mm;">
		<!-- Header -->
		<header class="flex items-start justify-between border-b border-slate-200 pb-6">
			<div>
				<p class="text-2xl font-bold text-slate-900">{senderName || '—'}</p>
				<p class="mt-1 text-sm text-slate-500">Rental Invoice</p>
			</div>
			<div class="text-right">
				<p class="text-3xl font-bold uppercase tracking-wider text-slate-900">Invoice</p>
				<p class="mt-1 font-mono text-sm text-slate-500">#{invoiceShortId}</p>
			</div>
		</header>

		<!-- Meta -->
		<section class="mt-6 grid grid-cols-2 gap-6">
			<div>
				<p class="text-xs font-medium uppercase tracking-wider text-slate-400">Bill to</p>
				<p class="mt-1 text-sm font-semibold text-slate-900">{invoice.tenant_name || '—'}</p>
				{#if invoice.tenant_email}
					<p class="text-sm text-slate-600">{invoice.tenant_email}</p>
				{/if}
				{#if invoice.tenant_phone}
					<p class="text-sm text-slate-600">{invoice.tenant_phone}</p>
				{/if}
				{#if invoice.tenant_address}
					<p class="text-sm text-slate-600">{invoice.tenant_address}</p>
				{/if}
			</div>
			<div>
				<p class="text-xs font-medium uppercase tracking-wider text-slate-400">Property</p>
				<p class="mt-1 text-sm font-semibold text-slate-900">{invoice.property_name || '—'}</p>
				{#if invoice.property_address}
					<p class="text-sm text-slate-600">{invoice.property_address}</p>
				{/if}
			</div>
		</section>

		<section class="mt-6 grid grid-cols-3 gap-6 rounded-lg bg-slate-50 p-4">
			<div>
				<p class="text-xs font-medium uppercase tracking-wider text-slate-400">Billing period</p>
				<p class="mt-1 text-sm font-semibold text-slate-900">{invoice.billingperiod || '—'}</p>
			</div>
			<div>
				<p class="text-xs font-medium uppercase tracking-wider text-slate-400">Issue date</p>
				<p class="mt-1 text-sm font-semibold text-slate-900">{formatDate(invoice.createdat)}</p>
			</div>
			<div>
				<p class="text-xs font-medium uppercase tracking-wider text-slate-400">Due date</p>
				<p class="mt-1 text-sm font-semibold text-slate-900">{formatDate(invoice.duedate)}</p>
			</div>
		</section>

		<!-- Line items -->
		<section class="mt-8">
			<table class="w-full border-collapse">
				<thead>
					<tr class="border-b-2 border-slate-300">
						<th class="py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
							Description
						</th>
						<th class="py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
							Amount
						</th>
					</tr>
				</thead>
				<tbody>
					{#if components().length > 0}
						{#each components() as comp}
							<tr class="border-b border-slate-100">
								<td class="py-3 text-sm text-slate-800">
									{comp.description || comp.name || '—'}
								</td>
								<td class="py-3 text-right text-sm text-slate-800">
									{formatCurrency(comp.amount, invoice.currency)}
								</td>
							</tr>
						{/each}
					{:else}
						<tr class="border-b border-slate-100">
							<td class="py-3 text-sm italic text-slate-500">
								No itemized breakdown — see total below.
							</td>
							<td></td>
						</tr>
					{/if}
				</tbody>
				<tfoot>
					<tr class="border-t-2 border-slate-900">
						<td class="py-3 text-base font-semibold text-slate-900">Total</td>
						<td class="py-3 text-right text-base font-bold text-slate-900">
							{formatCurrency(invoice.totalamount, invoice.currency)}
						</td>
					</tr>
				</tfoot>
			</table>
		</section>

		<!-- Notes -->
		{#if invoice.notes}
			<section class="mt-8 border-t border-slate-200 pt-6">
				<p class="text-xs font-medium uppercase tracking-wider text-slate-400">Notes</p>
				<p class="mt-2 whitespace-pre-wrap text-sm text-slate-700">{invoice.notes}</p>
			</section>
		{/if}

		<!-- Status footer -->
		<footer class="mt-12 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
			<p>
				Status: <span class="font-medium uppercase">{invoice.status || 'pending'}</span>
				{#if invoice.status === 'paid' && invoice.paymentdate}
					· Paid on {formatDate(invoice.paymentdate)}
				{/if}
			</p>
			<p class="mt-1">Invoice generated on {formatDate(invoice.createdat)}</p>
		</footer>
	</article>
</div>
