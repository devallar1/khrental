<script>
	import { enhance } from '$app/forms';
	import {
		Phone, Mail, ScrollText, Zap, Droplets, Wifi,
		User, UserPlus, Home as HomeIcon,
		ChevronLeft, Building2, TreePine, Layers, ArrowRight
	} from 'lucide-svelte';

	let { data, form } = $props();
	const realm = $derived(data.realm || []);

	let selectedPropertyId = $state(null);
	const selectedProperty = $derived(realm.find((p) => p.id === selectedPropertyId) || null);
	let activeFormUnit = $state(null);

	const propertyTypeIcon = (t) => {
		switch (t) {
			case 'land': return TreePine;
			case 'commercial': return Building2;
			case 'mixed': return Layers;
			default: return HomeIcon;
		}
	};

	const propertyStats = (p) => {
		const total = p.units.length;
		const occupied = p.units.filter((u) => u.rentee_id).length;
		const totalRent = p.units.reduce((s, u) => s + (Number(u.rentamount) || 0), 0);
		return { total, occupied, vacant: total - occupied, totalRent };
	};

	const fmtMoney = (n) => n == null
		? '—'
		: new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(n);
	const fmtDate = (d) => {
		if (!d) return '—';
		try { return new Date(d).toISOString().slice(0, 10); } catch { return String(d); }
	};

	const tenantBadge = (slug) => ({
		'kubeira-family':    { label: 'Kubeira Family',    dot: 'bg-rose-500',    chip: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900' },
		'kubeira-holdings':  { label: 'Kubeira Holdings',  dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900' },
		'kubeira-it-park':   { label: 'Kubeira IT Park',   dot: 'bg-sky-500',     chip: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900' },
		'vishwara-holdings': { label: 'Vishwara Holdings', dot: 'bg-amber-500',   chip: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900' }
	})[slug] || { label: slug, dot: 'bg-slate-400', chip: 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700' };
</script>

<svelte:head>
	<title>Manager — KH Rentals</title>
</svelte:head>

<div class="dark">
<div class="-m-3 min-h-screen bg-slate-950 p-3 text-slate-100 sm:-m-4 sm:p-4 md:-m-6 md:p-6 lg:-m-8 lg:p-8">
	{#if !selectedProperty}
		<div class="mb-6 flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-50">Manager</h1>
				<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{realm.length} {realm.length === 1 ? 'property' : 'properties'} across active tenants</p>
			</div>
		</div>
	{/if}

	{#if form?.ok}
		<div class="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
			<span class="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">✓</span>
			<div>
				{#if form.action === 'enterReading'}Reading logged · {form.consumed} units · LKR {form.calculatedBill}.
				{:else if form.action === 'sendInvoice'}Invoice generated · {fmtMoney(form.totalamount)}.
				{:else}Done.
				{/if}
			</div>
		</div>
	{/if}
	{#if form?.error}
		<div class="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
			<span class="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">!</span>
			<div>{form.error}</div>
		</div>
	{/if}

	{#if !selectedProperty}
		<!-- Property deck — Pokemon-card-ish portrait proportions -->
		<div class="grid grid-flow-row-dense grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{#each realm as property (property.id)}
				{@const stats = propertyStats(property)}
				{@const Icon = propertyTypeIcon(property.propertytype)}
				{@const badge = tenantBadge(property.tenant_slug)}
				{@const variant = property.units.length === 0
					? 'empty'
					: property.units.length === 1
						? 'single'
						: 'multi'}
				{@const sole = variant === 'single' ? property.units[0] : null}
				{@const tokenRows = Math.ceil(property.units.length / 2)}

				<button
					type="button"
					onclick={() => (selectedPropertyId = property.id)}
					class="property-card group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-left shadow-md transition hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500
						{variant === 'empty' ? 'card-empty' : ''}
						{variant === 'single' ? 'card-single' : ''}
						{variant === 'multi' ? 'card-multi' : ''}"
					style={variant === 'multi' ? `--token-rows:${tokenRows}` : ''}
				>
					<!-- Header -->
					<div class="flex items-start justify-between gap-3 border-b border-slate-800 {variant === 'empty' ? 'p-3' : 'p-4'}">
						<div class="flex min-w-0 items-start gap-3">
							<div class="flex {variant === 'empty' ? 'h-8 w-8' : 'h-10 w-10'} flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
								<Icon class={variant === 'empty' ? 'h-4 w-4' : 'h-5 w-5'} />
							</div>
							<div class="min-w-0">
								<h2 class="truncate {variant === 'empty' ? 'text-sm' : 'text-base'} font-semibold text-slate-100">{property.name}</h2>
								<div class="mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 {badge.chip}">
									<span class="h-1.5 w-1.5 rounded-full {badge.dot}"></span>
									{badge.label}
								</div>
							</div>
						</div>
						<ArrowRight class="h-4 w-4 flex-shrink-0 text-slate-600 transition group-hover:text-slate-400" />
					</div>

					{#if variant === 'empty'}
						<!-- Compact: just a label -->
						<div class="px-3 py-2 text-[11px] italic text-slate-500">no units recorded</div>

					{:else if variant === 'single'}
						<!-- Showcase the sole tenant -->
						<div class="flex flex-1 flex-col gap-3 p-5">
							{#if property.description}
								<p class="line-clamp-2 text-xs text-slate-400">{property.description}</p>
							{/if}
							<div class="flex flex-1 items-center gap-4 rounded-xl bg-slate-800/60 p-4">
								<div class="unit-token unit-token-xl {sole.rentee_id ? 'occupied' : 'vacant'}">
									<User class="h-9 w-9" />
								</div>
								<div class="min-w-0 flex-1">
									{#if sole.rentee_name}
										<p class="truncate text-lg font-semibold text-slate-100">{sole.rentee_name}</p>
										{#if sole.rentee_nic}<p class="text-xs text-slate-400">NIC · {sole.rentee_nic}</p>{/if}
										{#if sole.rentee_phone}<p class="mt-0.5 text-xs text-slate-400">☎ {sole.rentee_phone}</p>{/if}
									{:else}
										<p class="text-base italic text-slate-500">vacant</p>
									{/if}
									<p class="mt-2 text-[11px] uppercase tracking-wide text-slate-500">Unit · {sole.unitnumber}</p>
								</div>
							</div>
							<div class="mt-auto flex items-end justify-between pt-1">
								<span class="text-[11px] uppercase tracking-wide text-slate-500">
									{sole.rentee_id ? 'occupied' : 'vacant'}
								</span>
								<span class="font-mono text-base font-semibold tabular-nums text-slate-100">
									{fmtMoney(stats.totalRent)}
								</span>
							</div>
						</div>

					{:else}
						<!-- Multi: 2-column unit token grid -->
						<div class="flex flex-1 flex-col gap-3 p-5">
							{#if property.description}
								<p class="line-clamp-2 text-xs text-slate-400">{property.description}</p>
							{/if}
							<div class="grid grid-cols-2 gap-2">
								{#each property.units as unit (unit.id)}
									<div class="flex items-center justify-center rounded-lg bg-slate-800/40 py-2">
										<div
											class="unit-token {unit.rentee_id ? 'occupied' : 'vacant'}"
											title={`${unit.unitnumber}${unit.rentee_name ? ` · ${unit.rentee_name}` : ' · vacant'}`}
										>
											<User class="h-5 w-5" />
										</div>
									</div>
								{/each}
							</div>
							<div class="mt-auto flex items-end justify-between pt-2">
								<span class="text-[11px] uppercase tracking-wide text-slate-500">
									{stats.occupied}/{stats.total} occupied
								</span>
								<span class="font-mono text-base font-semibold tabular-nums text-slate-100">
									{fmtMoney(stats.totalRent)}
								</span>
							</div>
						</div>
					{/if}
				</button>
			{/each}
		</div>

		{#if realm.length === 0}
			<div class="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
				No properties found. Run the data import or seed properties first.
			</div>
		{/if}
	{:else}
		<!-- Property detail -->
		{@const property = selectedProperty}
		{@const Icon = propertyTypeIcon(property.propertytype)}
		{@const badge = tenantBadge(property.tenant_slug)}

		<button
			type="button"
			onclick={() => (selectedPropertyId = null)}
			class="mb-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
		>
			<ChevronLeft class="h-4 w-4" /> All properties
		</button>

		<div class="mb-6 flex flex-wrap items-start justify-between gap-4">
			<div class="flex items-start gap-3">
				<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
					<Icon class="h-6 w-6" />
				</div>
				<div>
					<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-50">{property.name}</h1>
					<div class="mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 {badge.chip}">
						<span class="h-1.5 w-1.5 rounded-full {badge.dot}"></span>
						{badge.label}
					</div>
					{#if property.description}
						<p class="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{property.description}</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Property utility bills (placeholder) -->
		<div class="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
			{#each [
				{ key: 'electricity', label: 'Electricity', Icon: Zap, light: 'text-amber-600 bg-amber-50', dark: 'dark:text-amber-300 dark:bg-amber-950/40' },
				{ key: 'water', label: 'Water', Icon: Droplets, light: 'text-sky-600 bg-sky-50', dark: 'dark:text-sky-300 dark:bg-sky-950/40' },
				{ key: 'slt', label: 'SLT / Internet', Icon: Wifi, light: 'text-emerald-600 bg-emerald-50', dark: 'dark:text-emerald-300 dark:bg-emerald-950/40' }
			] as bill}
				<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
					<div class="flex items-center gap-2">
						<div class="flex h-8 w-8 items-center justify-center rounded-lg {bill.light} {bill.dark}">
							<bill.Icon class="h-4 w-4" />
						</div>
						<div class="flex-1">
							<div class="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{bill.label}</div>
							<div class="text-sm italic text-slate-400 dark:text-slate-500">no bill recorded</div>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Unit grid -->
		{#if property.units.length === 0}
			<div class="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
				No units recorded for this property yet.
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				{#each property.units as unit (unit.id)}
					<article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-slate-950">
						<header class="mb-3 flex items-start justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
							<div class="flex items-center gap-2">
								<div class="unit-token {unit.rentee_id ? 'occupied' : 'vacant'} !h-9 !w-9">
									<User class="h-4 w-4" />
								</div>
								<h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">{unit.unitnumber}</h3>
							</div>
							<span class="text-[11px] font-medium uppercase tracking-wide {unit.rentee_id ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}">
								{unit.rentee_id ? 'occupied' : 'vacant'}
							</span>
						</header>

						<div class="mb-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
							<div class="mb-1 flex items-center justify-between">
								<span class="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Resident</span>
								{#if unit.rentee_id}
									<a href="/rentees/{unit.rentee_id}" class="text-[11px] font-medium text-sky-600 hover:underline dark:text-sky-400">view</a>
								{/if}
							</div>
							{#if unit.rentee_name}
								<p class="text-sm font-semibold text-slate-900 dark:text-slate-100">{unit.rentee_name}</p>
								{#if unit.rentee_nic}<p class="text-xs text-slate-500 dark:text-slate-400">NIC · {unit.rentee_nic}</p>{/if}
							{:else}
								<p class="text-sm italic text-slate-400 dark:text-slate-500">vacant</p>
							{/if}

							<dl class="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
								<dt class="text-slate-500 dark:text-slate-400">Rent</dt>
								<dd class="text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">{fmtMoney(unit.rentamount)}</dd>
								<dt class="text-slate-500 dark:text-slate-400">Deposit</dt>
								<dd class="text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{fmtMoney(unit.depositamount)}</dd>
								{#if unit.latest_reading}
									<dt class="text-slate-500 dark:text-slate-400">Reading</dt>
									<dd class="text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{unit.latest_reading.currentreading} · {fmtDate(unit.latest_reading.readingdate)}</dd>
								{/if}
								{#if unit.latest_invoice}
									<dt class="text-slate-500 dark:text-slate-400">Invoice</dt>
									<dd class="text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{unit.latest_invoice.billingperiod} · {fmtMoney(unit.latest_invoice.totalamount)}</dd>
								{/if}
							</dl>
						</div>

						<div class="flex flex-wrap gap-1.5">
							{#if unit.rentee_phone}
								<a class="action-btn" href="tel:{unit.rentee_phone}" title="Call {unit.rentee_phone}">
									<Phone class="h-3.5 w-3.5" /> Call
								</a>
							{/if}
							{#if unit.rentee_email && !unit.rentee_email.endsWith('@import.local')}
								<a class="action-btn" href="mailto:{unit.rentee_email}">
									<Mail class="h-3.5 w-3.5" /> Mail
								</a>
							{/if}
							{#if unit.rentee_id}
								<form method="POST" action="?/sendInvoice" use:enhance class="inline">
									<input type="hidden" name="unitId" value={unit.id} />
									<input type="hidden" name="propertyId" value={property.id} />
									<input type="hidden" name="renteeId" value={unit.rentee_id} />
									<input type="hidden" name="agreementId" value={unit.agreement_id} />
									<button type="submit" class="action-btn">
										<ScrollText class="h-3.5 w-3.5" /> Invoice
									</button>
								</form>
								<button
									type="button"
									class="action-btn"
									onclick={() => (activeFormUnit = activeFormUnit === unit.id ? null : unit.id)}
								>
									<Zap class="h-3.5 w-3.5" /> Reading
								</button>
								<a class="action-btn" href="/rentees/new?replaces={unit.rentee_id}&unit={unit.id}">
									<UserPlus class="h-3.5 w-3.5" /> Change
								</a>
							{:else}
								<a class="action-btn" href="/rentees/new?unit={unit.id}">
									<UserPlus class="h-3.5 w-3.5" /> Onboard
								</a>
							{/if}
						</div>

						{#if activeFormUnit === unit.id && unit.rentee_id}
							<form
								method="POST"
								action="?/enterReading"
								use:enhance={() => {
									return async ({ update }) => { await update(); activeFormUnit = null; };
								}}
								class="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60"
							>
								<input type="hidden" name="unitId" value={unit.id} />
								<input type="hidden" name="propertyId" value={property.id} />
								<input type="hidden" name="renteeId" value={unit.rentee_id} />
								<label class="block text-xs font-medium text-slate-600 dark:text-slate-300">
									Current meter (kWh)
									<span class="mt-1 flex gap-2">
										<input
											type="number"
											step="0.01"
											name="currentReading"
											required
											placeholder={unit.latest_reading?.currentreading ?? '0'}
											class="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-mono tabular-nums focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-sky-900"
										/>
										<button type="submit" class="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300">
											Log
										</button>
									</span>
								</label>
								{#if unit.latest_reading}
									<p class="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">prev · {unit.latest_reading.currentreading} on {fmtDate(unit.latest_reading.readingdate)}</p>
								{/if}
							</form>
						{/if}
					</article>
				{/each}
			</div>
		{/if}
	{/if}
</div>
</div>

<style>
	.unit-token {
		width: 44px;
		height: 52px;
		border-radius: 10px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: transform 120ms ease, box-shadow 120ms ease;
		cursor: default;
	}
	.unit-token.occupied {
		background: linear-gradient(180deg, #10b981 0%, #047857 100%);
		color: white;
		box-shadow: 0 1px 2px rgba(4, 120, 87, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.18);
	}
	.unit-token.vacant {
		background: linear-gradient(180deg, #f1f5f9 0%, #cbd5e1 100%);
		color: #64748b;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
		border: 1px solid #cbd5e1;
	}
	.unit-token:hover {
		transform: translateY(-1px) scale(1.05);
		box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
		z-index: 1;
	}

	.unit-token-xl {
		width: 80px;
		height: 96px;
		border-radius: 16px;
	}
	.unit-token-xl :global(svg) {
		width: 36px;
		height: 36px;
	}

	/* Pokemon-card-style proportions ~ 5:7 portrait */
	.property-card {
		aspect-ratio: 5 / 7;
	}
	.card-empty {
		aspect-ratio: 5 / 7;
	}
	.card-single {
		aspect-ratio: 5 / 7;
	}
	.card-multi {
		aspect-ratio: auto;
		min-height: calc(220px + var(--token-rows, 1) * 52px);
	}

	:global(.dark) .unit-token.occupied {
		background: linear-gradient(180deg, #059669 0%, #064e3b 100%);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.10);
	}
	:global(.dark) .unit-token.vacant {
		background: linear-gradient(180deg, #334155 0%, #1e293b 100%);
		color: #94a3b8;
		border-color: #475569;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
	}

	:global(.action-btn) {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 5px 10px;
		border-radius: 8px;
		border: 1px solid #e2e8f0;
		background: white;
		color: #0f172a;
		font-size: 11px;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
		transition: background 100ms ease, border-color 100ms ease, transform 100ms ease;
	}
	:global(.action-btn:hover) {
		background: #f8fafc;
		border-color: #cbd5e1;
		transform: translateY(-1px);
	}
	:global(.action-btn:active) {
		transform: translateY(0);
	}

	:global(.dark .action-btn) {
		background: #0f172a;
		border-color: #334155;
		color: #e2e8f0;
	}
	:global(.dark .action-btn:hover) {
		background: #1e293b;
		border-color: #475569;
	}
</style>
