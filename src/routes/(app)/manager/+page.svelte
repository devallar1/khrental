<script>
	import { enhance } from '$app/forms';
	import {
		Phone, Mail, ScrollText, Zap, Droplets, Wifi,
		User, UserPlus, Sword, Crown, Coins, Home as HomeIcon
	} from 'lucide-svelte';

	let { data, form } = $props();

	const realm = $derived(data.realm || []);

	const fmtMoney = (n) => {
		if (n == null) return '—';
		return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(n);
	};

	const fmtDate = (d) => {
		if (!d) return '—';
		try { return new Date(d).toISOString().slice(0, 10); }
		catch { return String(d); }
	};

	const tenantBadge = (slug) => ({
		'kubeira-family': { label: 'Kubeira Family', color: 'bg-rose-900/80 text-rose-50 border-rose-300' },
		'kubeira-holdings': { label: 'Kubeira Holdings', color: 'bg-emerald-900/80 text-emerald-50 border-emerald-300' },
		'kubeira-it-park': { label: 'Kubeira IT Park', color: 'bg-sky-900/80 text-sky-50 border-sky-300' },
		'vishwara-holdings': { label: 'Vishwara Holdings', color: 'bg-amber-900/80 text-amber-50 border-amber-300' }
	})[slug] || { label: slug, color: 'bg-stone-800/80 text-stone-100 border-stone-300' };

	let activeFormUnit = $state(null); // unitId currently showing the reading form
</script>

<svelte:head>
	<title>Manager's Ledger — KH Rentals</title>
	<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Spectral:wght@400;500;600&display=swap" />
</svelte:head>

<div class="ledger min-h-screen p-6 sm:p-10">
	<header class="mb-10 text-center">
		<div class="mx-auto inline-flex items-center gap-3">
			<Crown class="h-7 w-7 text-amber-700" />
			<h1 class="font-display text-4xl font-semibold tracking-wide text-stone-900 sm:text-5xl">Manager's Ledger</h1>
			<Crown class="h-7 w-7 text-amber-700" />
		</div>
		<p class="mt-2 font-serif italic text-stone-700">a record of all estates, chambers and their tenants</p>
		<div class="mx-auto mt-4 h-px w-48 bg-gradient-to-r from-transparent via-stone-700 to-transparent"></div>
	</header>

	{#if form?.ok}
		<div class="mx-auto mb-6 max-w-3xl rounded border-2 border-emerald-700 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow">
			<strong>✓ Done.</strong>
			{#if form.action === 'enterReading'}
				Logged {form.consumed} units consumed (LKR {form.calculatedBill}).
			{:else if form.action === 'sendInvoice'}
				Invoice generated, total {fmtMoney(form.totalamount)}.
			{/if}
		</div>
	{/if}

	{#if form?.error}
		<div class="mx-auto mb-6 max-w-3xl rounded border-2 border-rose-700 bg-rose-50 px-4 py-3 text-sm text-rose-900 shadow">
			<strong>✗ {form.error}</strong>
		</div>
	{/if}

	{#each realm as property (property.id)}
		<section class="mb-10">
			<div class="estate-banner mb-5 rounded-lg border-4 border-double border-stone-800 bg-stone-900/95 px-6 py-4 text-stone-50 shadow-lg">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div class="flex items-center gap-3">
						<HomeIcon class="h-6 w-6 text-amber-300" />
						<h2 class="font-display text-2xl font-semibold tracking-wider">{property.name}</h2>
					</div>
					<span class="rounded border px-2 py-0.5 text-xs uppercase tracking-widest {tenantBadge(property.tenant_slug).color}">
						{tenantBadge(property.tenant_slug).label}
					</span>
				</div>
				{#if property.description}
					<p class="mt-1 max-w-3xl font-serif text-sm italic text-stone-200">{property.description}</p>
				{/if}
			</div>

			<!-- Estate-level utility bills (placeholder until a property_utility_bills table lands) -->
			<div class="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
				{#each [
					{ key: 'electricity', label: 'Electricity', Icon: Zap, accent: 'text-amber-700' },
					{ key: 'water', label: 'Water (Board)', Icon: Droplets, accent: 'text-sky-700' },
					{ key: 'slt', label: 'SLT', Icon: Wifi, accent: 'text-emerald-700' }
				] as bill}
					<div class="rounded border-2 border-dashed border-stone-500 bg-stone-100/70 px-3 py-2 font-serif">
						<div class="flex items-center gap-2 text-xs uppercase tracking-widest text-stone-700">
							<bill.Icon class="h-3.5 w-3.5 {bill.accent}" />
							Estate {bill.label}
						</div>
						<div class="mt-1 text-sm text-stone-500 italic">no bill recorded</div>
					</div>
				{/each}
			</div>

			<!-- Unit cards -->
			{#if property.units.length === 0}
				<div class="rounded border border-dashed border-stone-500 bg-stone-100/60 p-6 text-center font-serif italic text-stone-600">
					No chambers recorded for this estate yet.
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
					{#each property.units as unit (unit.id)}
						<article class="unit-card relative rounded border-2 border-stone-700 bg-amber-50/95 p-4 shadow-md">
							<header class="mb-3 flex items-start justify-between border-b border-stone-700/40 pb-2">
								<div class="flex items-center gap-2">
									<Sword class="h-4 w-4 text-stone-700" />
									<h3 class="font-display text-lg font-semibold tracking-wider text-stone-900">{unit.unitnumber}</h3>
								</div>
								<span class="text-[10px] uppercase tracking-widest {unit.status === 'occupied' ? 'text-emerald-800' : 'text-stone-500'}">
									{unit.status || 'available'}
								</span>
							</header>

							<!-- Resident stat block -->
							<div class="mb-3 rounded bg-stone-900/5 p-3 font-serif text-sm">
								<div class="mb-1 flex items-center justify-between">
									<span class="text-[10px] uppercase tracking-widest text-stone-600">Resident</span>
									{#if unit.rentee_id}
										<a href="/rentees/{unit.rentee_id}" class="text-[10px] uppercase tracking-widest text-stone-700 underline-offset-2 hover:underline">view</a>
									{/if}
								</div>
								{#if unit.rentee_name}
									<p class="text-base font-semibold text-stone-900">{unit.rentee_name}</p>
									{#if unit.rentee_nic}
										<p class="text-xs text-stone-600">NIC: {unit.rentee_nic}</p>
									{/if}
								{:else}
									<p class="text-stone-500 italic">vacant chamber</p>
								{/if}

								<dl class="mt-2 grid grid-cols-2 gap-1 text-xs">
									<dt class="text-stone-600">Rent</dt>
									<dd class="text-right font-semibold text-stone-900">{fmtMoney(unit.rentamount)}</dd>
									<dt class="text-stone-600">Deposit</dt>
									<dd class="text-right text-stone-800">{fmtMoney(unit.depositamount)}</dd>
									{#if unit.latest_reading}
										<dt class="text-stone-600">Last reading</dt>
										<dd class="text-right text-stone-800">{unit.latest_reading.currentreading} ({fmtDate(unit.latest_reading.readingdate)})</dd>
									{/if}
									{#if unit.latest_invoice}
										<dt class="text-stone-600">Last invoice</dt>
										<dd class="text-right text-stone-800">{unit.latest_invoice.billingperiod} · {fmtMoney(unit.latest_invoice.totalamount)}</dd>
									{/if}
								</dl>
							</div>

							<!-- Quick action row -->
							<div class="flex flex-wrap gap-2 border-t border-stone-700/30 pt-2">
								{#if unit.rentee_phone}
									<a class="action-btn" href="tel:{unit.rentee_phone}" title="Call {unit.rentee_phone}">
										<Phone class="h-3.5 w-3.5" /> Call
									</a>
								{/if}
								{#if unit.rentee_email && !unit.rentee_email.endsWith('@import.local')}
									<a class="action-btn" href="mailto:{unit.rentee_email}" title="Mail {unit.rentee_email}">
										<Mail class="h-3.5 w-3.5" /> Mail
									</a>
								{/if}

								{#if unit.rentee_id}
									<form method="POST" action="?/sendInvoice" use:enhance class="inline">
										<input type="hidden" name="unitId" value={unit.id} />
										<input type="hidden" name="propertyId" value={property.id} />
										<input type="hidden" name="renteeId" value={unit.rentee_id} />
										<input type="hidden" name="agreementId" value={unit.agreement_id} />
										<button type="submit" class="action-btn" title="Generate invoice for this month">
											<ScrollText class="h-3.5 w-3.5" /> Send Invoice
										</button>
									</form>

									<button
										type="button"
										class="action-btn"
										onclick={() => (activeFormUnit = activeFormUnit === unit.id ? null : unit.id)}
									>
										<Zap class="h-3.5 w-3.5" /> Enter Reading
									</button>

									<a class="action-btn" href="/rentees/new?replaces={unit.rentee_id}&unit={unit.id}" title="Onboard a new resident">
										<UserPlus class="h-3.5 w-3.5" /> Change
									</a>
								{:else}
									<a class="action-btn" href="/rentees/new?unit={unit.id}">
										<UserPlus class="h-3.5 w-3.5" /> Onboard
									</a>
								{/if}
							</div>

							{#if activeFormUnit === unit.id && unit.rentee_id}
								<form method="POST" action="?/enterReading" use:enhance={() => {
									return async ({ update }) => { await update(); activeFormUnit = null; };
								}} class="mt-3 rounded border border-stone-600 bg-stone-100/80 p-2 font-serif">
									<input type="hidden" name="unitId" value={unit.id} />
									<input type="hidden" name="propertyId" value={property.id} />
									<input type="hidden" name="renteeId" value={unit.rentee_id} />
									<label class="block font-serif">
										<span class="block text-[10px] uppercase tracking-widest text-stone-700">Current meter (kWh)</span>
										<span class="mt-1 flex gap-2">
											<input
												type="number"
												step="0.01"
												name="currentReading"
												required
												placeholder={unit.latest_reading?.currentreading ?? '0'}
												class="w-full rounded border border-stone-500 bg-amber-50 px-2 py-1 text-sm"
											/>
											<button type="submit" class="rounded bg-stone-800 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-50 hover:bg-stone-700">
												Log
											</button>
										</span>
									</label>
									{#if unit.latest_reading}
										<p class="mt-1 text-[10px] text-stone-600">previous: {unit.latest_reading.currentreading} on {fmtDate(unit.latest_reading.readingdate)}</p>
									{/if}
								</form>
							{/if}
						</article>
					{/each}
				</div>
			{/if}
		</section>
	{/each}

	{#if realm.length === 0}
		<div class="mx-auto max-w-2xl rounded border border-stone-500 bg-stone-100/70 p-8 text-center font-serif italic text-stone-700">
			No estates found. Run the data import or seed properties first.
		</div>
	{/if}
</div>

<style>
	.ledger {
		background:
			radial-gradient(circle at 20% 0%, rgba(139, 90, 43, 0.06) 0%, transparent 40%),
			radial-gradient(circle at 80% 100%, rgba(139, 90, 43, 0.08) 0%, transparent 50%),
			linear-gradient(135deg, #f4ebd0 0%, #ead9b1 100%);
		color: #2b1d10;
		font-family: 'Spectral', Georgia, serif;
	}

	:global(.font-display) { font-family: 'Cinzel', 'Trajan Pro', Georgia, serif; letter-spacing: 0.04em; }
	:global(.font-serif)   { font-family: 'Spectral', Georgia, serif; }

	.estate-banner {
		background-image:
			linear-gradient(135deg, rgba(255, 215, 0, 0.04) 0%, transparent 100%),
			linear-gradient(0deg, #1c1410 0%, #2b1d10 100%);
	}

	.unit-card {
		background-image:
			radial-gradient(circle at 0% 0%, rgba(139, 90, 43, 0.08) 0%, transparent 30%),
			radial-gradient(circle at 100% 100%, rgba(139, 90, 43, 0.06) 0%, transparent 30%),
			linear-gradient(180deg, #fbf3dd 0%, #f0e3ba 100%);
		transition: transform 120ms ease, box-shadow 120ms ease;
	}
	.unit-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 16px rgba(60, 40, 20, 0.18);
	}

	:global(.action-btn) {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		border-radius: 4px;
		border: 1px solid #57442a;
		background: linear-gradient(180deg, #f7ecd0 0%, #e6d4a4 100%);
		color: #2b1d10;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		text-decoration: none;
		cursor: pointer;
		transition: background 100ms ease, transform 100ms ease;
	}
	:global(.action-btn:hover) {
		background: linear-gradient(180deg, #fff5d8 0%, #efdca8 100%);
		transform: translateY(-1px);
	}
	:global(.action-btn:active) {
		transform: translateY(0);
	}
</style>
