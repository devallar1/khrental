<script>
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Receipt, Plus, Trash2, Landmark, Building2, User, FileText, AlertTriangle } from 'lucide-svelte';
	import { formatCurrency } from '$lib/format/money.js';

	let { data, form } = $props();

	const tenant = $derived(data.tenant);
	const property = $derived(data.property);
	const unit = $derived(data.unit);
	const orgName = $derived(data.orgName);
	const prefill = $derived(data.prefill);
	const billingConfig = $derived(data.billingConfig);

	let billingPeriod = $state(prefill.billingPeriod);
	let dueDate = $state(prefill.dueDate);
	const currency = $derived(prefill.currency);
	let notes = $state('');

	// Rent line — always editable.
	let rent = $state({
		include: prefill.components.some((c) => c.label === 'RENT') ||
			!!data.agreement?.rentamount,
		description: 'Monthly Rent',
		amount: Number(data.agreement?.rentamount) || 0
	});

	// Electricity. Modes: 'fixed' | 'unit_based' | 'solar_offset' | 'skip'
	let elec = $state(initElec(billingConfig?.electricity, prefill));
	function initElec(cfg, pf) {
		const mode = cfg?.mode === 'client_managed' || !cfg?.mode ? 'skip' : cfg.mode;
		return {
			mode,
			fixed_lkr: cfg?.fixed_lkr ?? 0,
			rate: cfg?.rate ?? 50,
			offset_units: cfg?.offset_units ?? 0,
			prev: pf.elecPrev,
			curr: pf.elecCurrent
		};
	}

	// Water. Modes: 'fixed' | 'unit_based' | 'skip'
	let water = $state(initWater(billingConfig?.water, prefill));
	function initWater(cfg, pf) {
		const mode = cfg?.mode === 'client_managed' || !cfg?.mode ? 'skip' : cfg.mode;
		return {
			mode,
			fixed_lkr: cfg?.fixed_lkr ?? 0,
			rate: cfg?.rate ?? 25,
			prev: pf.waterPrev,
			curr: pf.waterCurrent
		};
	}

	// SLT (internet). Modes: 'passthrough' | 'fixed' | 'skip'
	let slt = $state(initSlt(billingConfig?.slt));
	function initSlt(cfg) {
		const mode = (cfg?.mode === 'client_managed' || cfg?.mode === 'none' || !cfg?.mode)
			? 'skip' : cfg.mode;
		return {
			mode,
			fixed_lkr: cfg?.fixed_lkr ?? 0,
			passthrough_amount: 0
		};
	}

	let others = $state([]); // [{description, amount}]
	function addOther() {
		others = [...others, { description: '', amount: 0 }];
	}
	function removeOther(idx) {
		others = others.filter((_, i) => i !== idx);
	}

	// Live-computed amounts per utility.
	const elecAmount = $derived.by(() => {
		if (elec.mode === 'skip') return 0;
		if (elec.mode === 'fixed') return Math.max(0, Number(elec.fixed_lkr) || 0);
		if (elec.mode === 'unit_based') {
			const consumed = Math.max(0, (Number(elec.curr) || 0) - (Number(elec.prev) || 0));
			return round2(consumed * (Number(elec.rate) || 0));
		}
		if (elec.mode === 'solar_offset') {
			const billable = Math.max(0, (Number(elec.curr) || 0) - (Number(elec.offset_units) || 0));
			return round2(billable * (Number(elec.rate) || 0));
		}
		return 0;
	});

	const waterAmount = $derived.by(() => {
		if (water.mode === 'skip') return 0;
		if (water.mode === 'fixed') return Math.max(0, Number(water.fixed_lkr) || 0);
		if (water.mode === 'unit_based') {
			const consumed = Math.max(0, (Number(water.curr) || 0) - (Number(water.prev) || 0));
			return round2(consumed * (Number(water.rate) || 0));
		}
		return 0;
	});

	const sltAmount = $derived.by(() => {
		if (slt.mode === 'skip') return 0;
		if (slt.mode === 'fixed') return Math.max(0, Number(slt.fixed_lkr) || 0);
		if (slt.mode === 'passthrough') return Math.max(0, Number(slt.passthrough_amount) || 0);
		return 0;
	});

	function round2(n) {
		return Math.round((Number(n) || 0) * 100) / 100;
	}

	// Composed components array (what gets POSTed).
	const components = $derived.by(() => {
		const lines = [];
		if (rent.include && Number(rent.amount) > 0) {
			lines.push({ description: rent.description || 'Monthly Rent', amount: round2(rent.amount) });
		}
		if (elecAmount > 0) {
			lines.push({ description: `Electricity (${billingPeriod})`, amount: elecAmount });
		}
		if (waterAmount > 0) {
			lines.push({ description: `Water (${billingPeriod})`, amount: waterAmount });
		}
		if (sltAmount > 0) {
			lines.push({ description: `Internet (${billingPeriod})`, amount: sltAmount });
		}
		for (const o of others) {
			const desc = String(o.description || '').trim();
			const amt = round2(o.amount);
			if (desc && amt > 0) lines.push({ description: desc, amount: amt });
		}
		return lines;
	});

	const total = $derived(components.reduce((s, c) => s + c.amount, 0));

	let submitting = $state(false);
	function onSubmit() {
		submitting = true;
		return async ({ update }) => {
			submitting = false;
			await update();
		};
	}
</script>

<svelte:head>
	<title>New invoice — {tenant?.name || ''}</title>
</svelte:head>

<div class="mx-auto max-w-5xl">
	<!-- Header -->
	<div class="mb-6 flex items-center gap-3">
		<a href="/manager" class="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
			<ArrowLeft class="h-4 w-4" />
			Back to manager
		</a>
	</div>

	<div class="mb-6">
		<h1 class="text-2xl font-bold text-foreground sm:text-3xl">New invoice</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Draft invoice for <span class="font-medium text-foreground">{tenant?.name || '—'}</span>
			{#if property}
				· {property.name}{#if unit?.unitnumber}, Unit {unit.unitnumber}{/if}
			{/if}
		</p>
	</div>

	{#if form?.error}
		<div class="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
			<AlertTriangle class="h-4 w-4 flex-shrink-0" />
			<span>{form.error}</span>
		</div>
	{/if}

	<form method="POST" action="?/saveDraft" use:enhance={onSubmit}>
		<input type="hidden" name="tenantId" value={tenant?.id || ''} />
		<input type="hidden" name="propertyId" value={property?.id || ''} />
		<input type="hidden" name="components" value={JSON.stringify(components)} />
		<input type="hidden" name="currency" value={currency} />

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Main form column -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Period + due date -->
				<div class="rounded-2xl border border-border bg-white p-6 shadow-sm">
					<h2 class="text-base font-semibold text-foreground">Period</h2>
					<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
						<label class="block">
							<span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Billing period</span>
							<input
								type="text"
								name="billingPeriod"
								bind:value={billingPeriod}
								placeholder="2026-05"
								class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</label>
						<label class="block">
							<span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Due date</span>
							<input
								type="date"
								name="dueDate"
								bind:value={dueDate}
								class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</label>
					</div>
				</div>

				<!-- Rent -->
				<div class="rounded-2xl border border-border bg-white p-6 shadow-sm">
					<div class="flex items-center justify-between">
						<h2 class="text-base font-semibold text-foreground">Rent</h2>
						<label class="flex items-center gap-2 text-sm text-muted-foreground">
							<input type="checkbox" bind:checked={rent.include} class="h-4 w-4" />
							Include
						</label>
					</div>
					{#if rent.include}
						<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
							<input
								type="text"
								bind:value={rent.description}
								placeholder="Monthly Rent"
								class="rounded-lg border border-border px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
							/>
							<input
								type="number"
								bind:value={rent.amount}
								step="0.01"
								min="0"
								class="rounded-lg border border-border px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</div>
					{/if}
				</div>

				<!-- Electricity -->
				<div class="rounded-2xl border border-border bg-white p-6 shadow-sm">
					<div class="flex items-center justify-between">
						<h2 class="text-base font-semibold text-foreground">Electricity</h2>
						<select
							bind:value={elec.mode}
							class="rounded-lg border border-border px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="skip">Skip</option>
							<option value="fixed">Fixed amount</option>
							<option value="unit_based">By units</option>
							<option value="solar_offset">Solar offset</option>
						</select>
					</div>

					{#if elec.mode === 'fixed'}
						<div class="mt-4">
							<label class="block">
								<span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount (LKR)</span>
								<input
									type="number"
									bind:value={elec.fixed_lkr}
									step="0.01"
									min="0"
									class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
								/>
							</label>
						</div>
					{:else if elec.mode === 'unit_based'}
						<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
							<label class="block">
								<span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Previous reading</span>
								<input type="number" bind:value={elec.prev} step="0.01" class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
							</label>
							<label class="block">
								<span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current reading</span>
								<input type="number" bind:value={elec.curr} step="0.01" class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
							</label>
							<label class="block">
								<span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rate (LKR/unit)</span>
								<input type="number" bind:value={elec.rate} step="0.01" class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
							</label>
						</div>
						<p class="mt-3 text-xs text-muted-foreground">
							{Math.max(0, (Number(elec.curr) || 0) - (Number(elec.prev) || 0))} units
							× {formatCurrency(elec.rate, currency)}
							= <span class="font-semibold text-foreground">{formatCurrency(elecAmount, currency)}</span>
						</p>
					{:else if elec.mode === 'solar_offset'}
						<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
							<label class="block">
								<span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current reading</span>
								<input type="number" bind:value={elec.curr} step="0.01" class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
							</label>
							<label class="block">
								<span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Offset units</span>
								<input type="number" bind:value={elec.offset_units} step="0.01" class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
							</label>
							<label class="block">
								<span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rate (LKR/unit)</span>
								<input type="number" bind:value={elec.rate} step="0.01" class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
							</label>
						</div>
						<p class="mt-3 text-xs text-muted-foreground">
							max(0, {elec.curr} − {elec.offset_units})
							× {formatCurrency(elec.rate, currency)}
							= <span class="font-semibold text-foreground">{formatCurrency(elecAmount, currency)}</span>
						</p>
					{/if}
				</div>

				<!-- Water -->
				<div class="rounded-2xl border border-border bg-white p-6 shadow-sm">
					<div class="flex items-center justify-between">
						<h2 class="text-base font-semibold text-foreground">Water</h2>
						<select
							bind:value={water.mode}
							class="rounded-lg border border-border px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="skip">Skip</option>
							<option value="fixed">Fixed amount</option>
							<option value="unit_based">By units</option>
						</select>
					</div>

					{#if water.mode === 'fixed'}
						<div class="mt-4">
							<label class="block">
								<span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount (LKR)</span>
								<input type="number" bind:value={water.fixed_lkr} step="0.01" min="0" class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
							</label>
						</div>
					{:else if water.mode === 'unit_based'}
						<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
							<label class="block">
								<span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Previous reading</span>
								<input type="number" bind:value={water.prev} step="0.01" class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
							</label>
							<label class="block">
								<span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current reading</span>
								<input type="number" bind:value={water.curr} step="0.01" class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
							</label>
							<label class="block">
								<span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rate (LKR/unit)</span>
								<input type="number" bind:value={water.rate} step="0.01" class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
							</label>
						</div>
						<p class="mt-3 text-xs text-muted-foreground">
							{Math.max(0, (Number(water.curr) || 0) - (Number(water.prev) || 0))} units
							× {formatCurrency(water.rate, currency)}
							= <span class="font-semibold text-foreground">{formatCurrency(waterAmount, currency)}</span>
						</p>
					{/if}
				</div>

				<!-- Internet (SLT) -->
				<div class="rounded-2xl border border-border bg-white p-6 shadow-sm">
					<div class="flex items-center justify-between">
						<h2 class="text-base font-semibold text-foreground">Internet (SLT)</h2>
						<select
							bind:value={slt.mode}
							class="rounded-lg border border-border px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="skip">Skip</option>
							<option value="passthrough">Pass-through (enter actual bill)</option>
							<option value="fixed">Fixed amount</option>
						</select>
					</div>

					{#if slt.mode === 'fixed'}
						<div class="mt-4">
							<label class="block">
								<span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount (LKR)</span>
								<input type="number" bind:value={slt.fixed_lkr} step="0.01" min="0" class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
							</label>
						</div>
					{:else if slt.mode === 'passthrough'}
						<div class="mt-4">
							<label class="block">
								<span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">SLT bill amount (LKR)</span>
								<input type="number" bind:value={slt.passthrough_amount} step="0.01" min="0" class="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
							</label>
							<p class="mt-2 text-xs text-muted-foreground">Enter the actual SLT invoice amount you received for this period.</p>
						</div>
					{/if}
				</div>

				<!-- Other items -->
				<div class="rounded-2xl border border-border bg-white p-6 shadow-sm">
					<div class="flex items-center justify-between">
						<h2 class="text-base font-semibold text-foreground">Other items</h2>
						<button
							type="button"
							onclick={addOther}
							class="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
						>
							<Plus class="h-3.5 w-3.5" />
							Add row
						</button>
					</div>
					{#if others.length === 0}
						<p class="mt-3 text-sm text-muted-foreground">No other items.</p>
					{:else}
						<div class="mt-4 space-y-2">
							{#each others as o, idx (idx)}
								<div class="grid grid-cols-[2fr_1fr_auto] gap-2">
									<input
										type="text"
										bind:value={o.description}
										placeholder="Description"
										class="rounded-lg border border-border px-3 py-2 text-sm"
									/>
									<input
										type="number"
										bind:value={o.amount}
										step="0.01"
										placeholder="0.00"
										class="rounded-lg border border-border px-3 py-2 text-sm"
									/>
									<button
										type="button"
										onclick={() => removeOther(idx)}
										class="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
										title="Remove"
									>
										<Trash2 class="h-4 w-4" />
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Notes -->
				<div class="rounded-2xl border border-border bg-white p-6 shadow-sm">
					<h2 class="text-base font-semibold text-foreground">Notes</h2>
					<textarea
						name="notes"
						bind:value={notes}
						rows="3"
						placeholder="Optional notes shown on the invoice."
						class="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					></textarea>
				</div>
			</div>

			<!-- Sidebar -->
			<div class="space-y-6">
				<!-- Bill-to summary -->
				<div class="rounded-2xl border border-border bg-white p-6 shadow-sm">
					<p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Bill to</p>
					<div class="mt-2 flex items-start gap-2">
						<User class="mt-0.5 h-4 w-4 text-muted-foreground" />
						<div>
							<p class="text-sm font-medium text-foreground">{tenant?.name || '—'}</p>
							{#if tenant?.email}<p class="text-xs text-muted-foreground">{tenant.email}</p>{/if}
							{#if tenant?.phone}<p class="text-xs text-muted-foreground">{tenant.phone}</p>{/if}
						</div>
					</div>
					{#if property}
						<div class="mt-3 flex items-start gap-2">
							<Building2 class="mt-0.5 h-4 w-4 text-muted-foreground" />
							<div>
								<p class="text-sm font-medium text-foreground">{property.name}</p>
								{#if unit?.unitnumber}<p class="text-xs text-muted-foreground">Unit {unit.unitnumber}</p>{/if}
								{#if property.address}<p class="text-xs text-muted-foreground">{property.address}</p>{/if}
							</div>
						</div>
					{/if}
				</div>

				<!-- Bank routing -->
				<div class="rounded-2xl border border-border bg-white p-6 shadow-sm">
					<p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Bank routing</p>
					{#if unit?.bank_label}
						<div class="mt-2 flex items-start gap-2">
							<Landmark class="mt-0.5 h-4 w-4 text-muted-foreground" />
							<div>
								<p class="text-sm font-medium text-foreground">{unit.bank_label}</p>
								{#if unit.bank_name}<p class="text-xs text-muted-foreground">{unit.bank_name}{#if unit.branch} — {unit.branch}{/if}</p>{/if}
								{#if unit.account_number}<p class="font-mono text-xs text-muted-foreground">{unit.account_number}</p>{/if}
							</div>
						</div>
					{:else}
						<p class="mt-2 text-sm text-muted-foreground">No bank profile routed for this unit.</p>
					{/if}
				</div>

				<!-- Live total -->
				<div class="rounded-2xl border border-border bg-white p-6 shadow-sm">
					<p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</p>
					<p class="mt-2 text-3xl font-bold text-foreground">{formatCurrency(total, currency)}</p>
					<p class="mt-1 text-xs text-muted-foreground">{components.length} line item{components.length === 1 ? '' : 's'}</p>

					{#if components.length > 0}
						<ul class="mt-4 space-y-1 border-t border-border pt-3">
							{#each components as c}
								<li class="flex justify-between text-xs">
									<span class="text-muted-foreground">{c.description}</span>
									<span class="font-medium text-foreground">{formatCurrency(c.amount, currency)}</span>
								</li>
							{/each}
						</ul>
					{/if}
				</div>

				<!-- Submit -->
				<div class="space-y-2">
					<button
						type="submit"
						disabled={submitting || components.length === 0}
						class="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary disabled:cursor-not-allowed disabled:opacity-50"
					>
						<Receipt class="h-4 w-4" />
						{submitting ? 'Saving…' : 'Save as draft'}
					</button>
					<a
						href="/manager"
						class="block w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-center text-sm font-medium text-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-secondary"
					>
						Cancel
					</a>
					{#if components.length === 0}
						<p class="text-center text-xs text-muted-foreground">Add at least one line item to save.</p>
					{/if}
				</div>
			</div>
		</div>
	</form>
</div>
