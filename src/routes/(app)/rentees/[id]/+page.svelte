<script>
	import { ArrowLeft, Pencil, Mail, Phone, MapPin, CreditCard, FileText, Receipt, Calendar, User } from 'lucide-svelte';

	let { data } = $props();

	const rentee = $derived(data.rentee);

	const phone = $derived(() => {
		const cd = rentee.contact_details;
		if (!cd) return null;
		if (typeof cd === 'string') {
			try { return JSON.parse(cd)?.phone || null; } catch { return null; }
		}
		return cd?.phone || null;
	});

	const formatDate = (d) => {
		if (!d) return '-';
		return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	};

	const formatCurrency = (amount) => {
		if (amount == null) return '-';
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
	};

	const statusColor = (status) => {
		const s = (status || '').toLowerCase();
		if (s === 'active' || s === 'paid' || s === 'signed') return 'bg-emerald-50 text-emerald-700';
		if (s === 'pending' || s === 'draft') return 'bg-amber-50 text-amber-700';
		if (s === 'overdue' || s === 'cancelled' || s === 'expired') return 'bg-red-50 text-red-700';
		return 'bg-slate-100 text-slate-600';
	};
</script>

<svelte:head>
	<title>{rentee.name || 'Rentee'} - KH Rentals</title>
</svelte:head>

<div>
	<!-- Header -->
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex items-center gap-3">
			<a
				href="/rentees"
				class="rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50"
			>
				<ArrowLeft class="h-4 w-4" />
			</a>
			<div>
				<h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">{rentee.name || 'Unnamed Rentee'}</h1>
				<p class="mt-0.5 text-sm text-slate-500">Added {formatDate(rentee.createdat)}</p>
			</div>
		</div>
		<div class="flex gap-2">
			<a
				href="/rentees/{rentee.id}/edit"
				class="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
			>
				<Pencil class="h-4 w-4" />
				Edit
			</a>
		</div>
	</div>

	<!-- Info card -->
	<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="flex items-start justify-between">
			<div class="flex items-center gap-4">
				<div class="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-xl font-semibold text-sky-700">
					{(rentee.name || '?').charAt(0).toUpperCase()}
				</div>
				<div>
					<h2 class="text-lg font-semibold text-slate-900">{rentee.name || 'Unnamed'}</h2>
					<span
						class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {rentee.active
							? 'bg-emerald-50 text-emerald-700'
							: 'bg-slate-100 text-slate-600'}"
					>
						{rentee.active ? 'Active' : 'Inactive'}
					</span>
				</div>
			</div>
		</div>

		<div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#if rentee.email}
				<div class="flex items-center gap-2 text-sm">
					<Mail class="h-4 w-4 text-slate-400" />
					<span class="text-slate-700">{rentee.email}</span>
				</div>
			{/if}
			{#if phone()}
				<div class="flex items-center gap-2 text-sm">
					<Phone class="h-4 w-4 text-slate-400" />
					<span class="text-slate-700">{phone()}</span>
				</div>
			{/if}
			{#if rentee.permanent_address}
				<div class="flex items-center gap-2 text-sm">
					<MapPin class="h-4 w-4 text-slate-400" />
					<span class="text-slate-700">{rentee.permanent_address}</span>
				</div>
			{/if}
			{#if rentee.national_id}
				<div class="flex items-center gap-2 text-sm">
					<CreditCard class="h-4 w-4 text-slate-400" />
					<span class="text-slate-700">ID: {rentee.national_id}</span>
				</div>
			{/if}
		</div>

		{#if rentee.notes}
			<div class="mt-4 rounded-xl bg-slate-50 p-4">
				<p class="text-xs font-medium uppercase tracking-wide text-slate-500">Notes</p>
				<p class="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{rentee.notes}</p>
			</div>
		{/if}
	</div>

	<!-- Agreements -->
	<div class="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="flex items-center gap-2 mb-4">
			<FileText class="h-5 w-5 text-slate-400" />
			<h2 class="text-lg font-semibold text-slate-900">Agreements</h2>
			<span class="ml-auto text-sm text-slate-500">{data.agreements.length} total</span>
		</div>

		{#if data.agreements.length > 0}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
							<th class="pb-3 pr-4">Title</th>
							<th class="pb-3 pr-4">Property</th>
							<th class="pb-3 pr-4">Period</th>
							<th class="pb-3 pr-4">Rent</th>
							<th class="pb-3">Status</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-50">
						{#each data.agreements as agreement}
							<tr class="hover:bg-slate-50">
								<td class="py-3 pr-4">
									<a href="/agreements/{agreement.id}" class="font-medium text-sky-700 hover:text-sky-800">
										{agreement.title || 'Untitled'}
									</a>
								</td>
								<td class="py-3 pr-4 text-slate-600">{agreement.property_name || '-'}</td>
								<td class="py-3 pr-4 text-slate-600">
									{formatDate(agreement.startdate)} - {formatDate(agreement.enddate)}
								</td>
								<td class="py-3 pr-4 text-slate-600">{formatCurrency(agreement.rentamount)}</td>
								<td class="py-3">
									<span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {statusColor(agreement.status)}">
										{agreement.status || '-'}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-center text-sm text-slate-500 py-6">No agreements found for this rentee.</p>
		{/if}
	</div>

	<!-- Invoices -->
	<div class="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="flex items-center gap-2 mb-4">
			<Receipt class="h-5 w-5 text-slate-400" />
			<h2 class="text-lg font-semibold text-slate-900">Recent Invoices</h2>
			<span class="ml-auto text-sm text-slate-500">{data.invoices.length} shown</span>
		</div>

		{#if data.invoices.length > 0}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
							<th class="pb-3 pr-4">Period</th>
							<th class="pb-3 pr-4">Property</th>
							<th class="pb-3 pr-4">Amount</th>
							<th class="pb-3 pr-4">Due Date</th>
							<th class="pb-3">Status</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-50">
						{#each data.invoices as invoice}
							<tr class="hover:bg-slate-50">
								<td class="py-3 pr-4">
									<a href="/invoices/{invoice.id}" class="font-medium text-sky-700 hover:text-sky-800">
										{invoice.billingperiod || '-'}
									</a>
								</td>
								<td class="py-3 pr-4 text-slate-600">{invoice.property_name || '-'}</td>
								<td class="py-3 pr-4 text-slate-600">{formatCurrency(invoice.totalamount)}</td>
								<td class="py-3 pr-4 text-slate-600">{formatDate(invoice.duedate)}</td>
								<td class="py-3">
									<span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {statusColor(invoice.status)}">
										{invoice.status || '-'}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-center text-sm text-slate-500 py-6">No invoices found for this rentee.</p>
		{/if}
	</div>
</div>
