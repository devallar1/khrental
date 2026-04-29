<script>
	import { FileText, Building2, Calendar, ExternalLink, Check } from 'lucide-svelte';

	let { data } = $props();
	const agreement = $derived(data.agreement);

	const formatDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
	const formatMoney = (n) => (n == null ? '—' : new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n)));

	const docUrl = $derived(
		agreement?.signed_document_url ||
		agreement?.signeddocumenturl ||
		agreement?.pdfurl ||
		agreement?.documenturl ||
		null
	);

	const statusClass = (s) => {
		switch ((s || '').toLowerCase()) {
			case 'active': return 'bg-emerald-100 text-emerald-700';
			case 'draft': return 'bg-slate-100 text-slate-700';
			case 'expired': return 'bg-rose-100 text-rose-700';
			case 'cancelled': return 'bg-slate-200 text-slate-600';
			case 'pending': return 'bg-amber-100 text-amber-700';
			default: return 'bg-slate-100 text-slate-700';
		}
	};
</script>

<svelte:head>
	<title>My Contract — KH Rentals</title>
</svelte:head>

<div class="max-w-3xl">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">My Contract</h1>
		<p class="mt-1 text-sm text-slate-500">Your current rental agreement with KH Rentals.</p>
	</div>

	{#if !agreement}
		<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
			<FileText class="mx-auto h-8 w-8 text-slate-300" />
			<p class="mt-3 text-sm font-medium text-slate-700">No contract on file yet</p>
			<p class="mt-1 text-xs text-slate-500">Once your manager creates an agreement for you, it'll appear here.</p>
		</div>
	{:else}
		<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex items-start justify-between gap-4 mb-5">
				<div class="min-w-0">
					<h2 class="text-lg font-semibold text-slate-900 truncate">{agreement.title || 'Rental agreement'}</h2>
					<p class="text-xs text-slate-500 mt-1">
						Created {formatDate(agreement.createdat)}
					</p>
				</div>
				<span class="flex-shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize {statusClass(agreement.status)}">
					{agreement.status || 'unknown'}
				</span>
			</div>

			<div class="rounded-xl border border-slate-100 bg-slate-50 p-4 mb-5">
				<div class="flex items-start gap-3">
					<Building2 class="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
					<div class="min-w-0">
						<p class="text-sm font-medium text-slate-900 truncate">{agreement.property_name || 'Property'}</p>
						{#if agreement.unit_number}
							<p class="text-xs text-slate-500">Unit {agreement.unit_number}{agreement.unit_floor ? ` · Floor ${agreement.unit_floor}` : ''}</p>
						{/if}
						{#if agreement.property_address}
							<p class="text-xs text-slate-500 mt-0.5">{agreement.property_address}</p>
						{/if}
					</div>
				</div>
			</div>

			<dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-5">
				<div>
					<dt class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
						<Calendar class="w-3.5 h-3.5" /> Term
					</dt>
					<dd class="mt-1 text-sm text-slate-900">
						{formatDate(agreement.startdate)} — {formatDate(agreement.enddate)}
					</dd>
				</div>

				<div>
					<dt class="text-xs font-medium uppercase tracking-wide text-slate-500">Monthly rent</dt>
					<dd class="mt-1 font-mono text-sm text-slate-900">{formatMoney(agreement.rentamount)}</dd>
				</div>

				<div>
					<dt class="text-xs font-medium uppercase tracking-wide text-slate-500">Deposit</dt>
					<dd class="mt-1 font-mono text-sm text-slate-900">{formatMoney(agreement.depositamount)}</dd>
				</div>

				<div>
					<dt class="text-xs font-medium uppercase tracking-wide text-slate-500">Signed</dt>
					<dd class="mt-1 text-sm text-slate-900">
						{#if agreement.signeddate}
							<span class="inline-flex items-center gap-1 text-emerald-700">
								<Check class="w-3.5 h-3.5" /> {formatDate(agreement.signeddate)}
							</span>
						{:else if agreement.signature_status}
							<span class="text-amber-700 capitalize">{agreement.signature_status}</span>
						{:else}
							—
						{/if}
					</dd>
				</div>
			</dl>

			{#if agreement.notes}
				<div class="rounded-xl border border-slate-100 bg-slate-50 p-3 mb-5">
					<p class="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">Notes</p>
					<p class="text-sm text-slate-700 whitespace-pre-wrap">{agreement.notes}</p>
				</div>
			{/if}

			{#if docUrl}
				<a
					href={docUrl}
					target="_blank"
					rel="noopener"
					class="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition no-underline"
				>
					<FileText class="w-4 h-4" />
					Open contract document
					<ExternalLink class="w-3.5 h-3.5" />
				</a>
			{:else}
				<p class="text-xs text-slate-400 italic">Document not yet uploaded.</p>
			{/if}
		</div>
	{/if}
</div>
