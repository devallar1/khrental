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
			case 'active':
				return 'bg-success/15 text-success';
			case 'draft':
				return 'bg-primary/15 text-primary';
			case 'expired':
			case 'cancelled':
				return 'bg-destructive/15 text-destructive';
			case 'pending':
				return 'bg-warning/20 text-warning-foreground dark:bg-warning/15 dark:text-warning';
			default:
				return 'bg-muted text-muted-foreground';
		}
	};
</script>

<svelte:head>
	<title>My Contract — KH Rentals</title>
</svelte:head>

<div class="max-w-3xl">
	<header class="mb-6">
		<p class="kicker">My contract</p>
		<h1 class="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
			Rental agreement
		</h1>
		<p class="mt-1 text-sm text-muted-foreground">Your current rental agreement with KH Rentals.</p>
	</header>

	{#if !agreement}
		<div class="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
			<FileText class="mx-auto h-8 w-8 text-muted-foreground" />
			<p class="mt-3 text-sm font-medium text-foreground">No contract on file yet</p>
			<p class="mt-1 text-xs text-muted-foreground">Once your manager creates an agreement for you, it'll appear here.</p>
		</div>
	{:else}
		<div class="rounded-2xl border border-border bg-card p-6 shadow-sm">
			<div class="flex items-start justify-between gap-4 mb-5">
				<div class="min-w-0">
					<h2 class="text-lg font-semibold text-foreground truncate">{agreement.title || 'Rental agreement'}</h2>
					<p class="text-xs text-muted-foreground mt-1">
						Created {formatDate(agreement.createdat)}
					</p>
				</div>
				<span class="flex-shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize {statusClass(agreement.status)}">
					{agreement.status || 'unknown'}
				</span>
			</div>

			<div class="rounded-xl border border-border bg-secondary/50 p-4 mb-5">
				<div class="flex items-start gap-3">
					<Building2 class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
					<div class="min-w-0">
						<p class="text-sm font-medium text-foreground truncate">{agreement.property_name || 'Property'}</p>
						{#if agreement.unit_number}
							<p class="text-xs text-muted-foreground">Unit {agreement.unit_number}{agreement.unit_floor ? ` · Floor ${agreement.unit_floor}` : ''}</p>
						{/if}
						{#if agreement.property_address}
							<p class="text-xs text-muted-foreground mt-0.5">{agreement.property_address}</p>
						{/if}
					</div>
				</div>
			</div>

			<dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-5">
				<div>
					<dt class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
						<Calendar class="w-3.5 h-3.5" /> Term
					</dt>
					<dd class="mt-1 text-sm text-foreground">
						{formatDate(agreement.startdate)} — {formatDate(agreement.enddate)}
					</dd>
				</div>

				<div>
					<dt class="kicker">Monthly rent</dt>
					<dd class="mt-1 font-mono text-sm text-foreground">{formatMoney(agreement.rentamount)}</dd>
				</div>

				<div>
					<dt class="kicker">Deposit</dt>
					<dd class="mt-1 font-mono text-sm text-foreground">{formatMoney(agreement.depositamount)}</dd>
				</div>

				<div>
					<dt class="kicker">Signed</dt>
					<dd class="mt-1 text-sm">
						{#if agreement.signeddate}
							<span class="inline-flex items-center gap-1 text-success">
								<Check class="w-3.5 h-3.5" /> {formatDate(agreement.signeddate)}
							</span>
						{:else if agreement.signature_status}
							<span class="capitalize text-warning-foreground dark:text-warning">{agreement.signature_status}</span>
						{:else}
							—
						{/if}
					</dd>
				</div>
			</dl>

			{#if agreement.notes}
				<div class="rounded-xl border border-border bg-secondary/50 p-3 mb-5">
					<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
					<p class="text-sm text-foreground whitespace-pre-wrap">{agreement.notes}</p>
				</div>
			{/if}

			{#if docUrl}
				<a
					href={docUrl}
					target="_blank"
					rel="noopener"
					class="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary no-underline"
				>
					<FileText class="w-4 h-4" />
					Open contract document
					<ExternalLink class="w-3.5 h-3.5" />
				</a>
			{:else}
				<p class="italic text-xs text-muted-foreground">Document not yet uploaded.</p>
			{/if}
		</div>
	{/if}
</div>
