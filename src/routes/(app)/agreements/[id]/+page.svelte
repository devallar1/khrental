<script>
	import { ArrowLeft, FileText, User, Building2, Calendar, DollarSign } from 'lucide-svelte';

	let { data } = $props();

	const a = $derived(data.agreement);

	const statusBadgeClass = (status) => {
		const base = 'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium';
		switch (status) {
			case 'active':
			case 'signed':
				return `${base} bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20`;
			case 'draft':
				return `${base} bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20`;
			case 'cancelled':
				return `${base} bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20`;
			case 'pending':
				return `${base} bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20`;
			default:
				return `${base} bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20`;
		}
	};

	const formatDate = (dateStr) => {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	};

	const formatCurrency = (amount) => {
		if (amount == null) return '-';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
	};
</script>

<svelte:head>
	<title>{a.title || 'Agreement'} - KH Rentals</title>
</svelte:head>

<div>
	<!-- Header -->
	<div class="mb-6">
		<a
			href="/agreements"
			class="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-700"
		>
			<ArrowLeft class="h-4 w-4" />
			Back to Agreements
		</a>

		<div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">{a.title || 'Untitled Agreement'}</h1>
				<p class="mt-1 text-sm text-slate-500">Created {formatDate(a.createdat)}</p>
			</div>
			<span class={statusBadgeClass(a.status)}>
				{a.status || 'draft'}
			</span>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Main content -->
		<div class="space-y-6 lg:col-span-2">
			<!-- Agreement Details -->
			<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<h2 class="flex items-center gap-2 text-lg font-semibold text-slate-900">
					<FileText class="h-5 w-5 text-slate-400" />
					Agreement Details
				</h2>

				<dl class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<dt class="text-sm font-medium text-slate-500">Start Date</dt>
						<dd class="mt-1 text-sm text-slate-900">{formatDate(a.startdate)}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-slate-500">End Date</dt>
						<dd class="mt-1 text-sm text-slate-900">{formatDate(a.enddate)}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-slate-500">Monthly Rent</dt>
						<dd class="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(a.rentamount)}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-slate-500">Security Deposit</dt>
						<dd class="mt-1 text-sm text-slate-900">{formatCurrency(a.depositamount)}</dd>
					</div>
				</dl>

				{#if a.template_name}
					<div class="mt-4 border-t border-slate-100 pt-4">
						<dt class="text-sm font-medium text-slate-500">Template</dt>
						<dd class="mt-1 text-sm text-slate-900">
							{a.template_name}
							<span class="text-slate-400">v{a.template_version || '1.0'} / {a.template_language || 'English'}</span>
						</dd>
					</div>
				{/if}
			</div>

			<!-- Content -->
			{#if a.content}
				<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<h2 class="text-lg font-semibold text-slate-900">Content</h2>
					<div class="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{a.content}</div>
				</div>
			{/if}

			<!-- Notes -->
			{#if a.notes}
				<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<h2 class="text-lg font-semibold text-slate-900">Notes</h2>
					<div class="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{a.notes}</div>
				</div>
			{/if}
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Tenant Info -->
			<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<h2 class="flex items-center gap-2 text-lg font-semibold text-slate-900">
					<User class="h-5 w-5 text-slate-400" />
					Tenant
				</h2>
				{#if a.tenant_name}
					<div class="mt-4 space-y-2">
						<p class="text-sm font-medium text-slate-900">{a.tenant_name}</p>
						{#if a.tenant_email}
							<p class="text-sm text-slate-500">{a.tenant_email}</p>
						{/if}
						{#if a.tenant_phone}
							<p class="text-sm text-slate-500">{a.tenant_phone}</p>
						{/if}
					</div>
				{:else}
					<p class="mt-4 text-sm text-slate-400">No tenant assigned</p>
				{/if}
			</div>

			<!-- Property Info -->
			<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<h2 class="flex items-center gap-2 text-lg font-semibold text-slate-900">
					<Building2 class="h-5 w-5 text-slate-400" />
					Property
				</h2>
				{#if a.property_name}
					<div class="mt-4 space-y-2">
						<p class="text-sm font-medium text-slate-900">{a.property_name}</p>
						{#if a.property_address}
							<p class="text-sm text-slate-500">{a.property_address}</p>
						{/if}
						{#if a.property_city}
							<p class="text-sm text-slate-500">{a.property_city}</p>
						{/if}
						{#if a.unit_number}
							<p class="text-sm text-slate-500">Unit: {a.unit_number}</p>
						{/if}
					</div>
				{:else}
					<p class="mt-4 text-sm text-slate-400">No property assigned</p>
				{/if}
			</div>

			<!-- Timestamps -->
			<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<h2 class="flex items-center gap-2 text-lg font-semibold text-slate-900">
					<Calendar class="h-5 w-5 text-slate-400" />
					Timestamps
				</h2>
				<div class="mt-4 space-y-2">
					<div>
						<dt class="text-xs font-medium text-slate-400">Created</dt>
						<dd class="text-sm text-slate-600">{formatDate(a.createdat)}</dd>
					</div>
					{#if a.updatedat}
						<div>
							<dt class="text-xs font-medium text-slate-400">Last Updated</dt>
							<dd class="text-sm text-slate-600">{formatDate(a.updatedat)}</dd>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
