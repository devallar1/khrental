<script>
	import { enhance } from '$app/forms';
	import { X, Save, Calendar, Wallet } from 'lucide-svelte';
	import { defaultBillingConfig } from '$lib/billing/config.js';

	let {
		// Required: which agreement we're editing.
		agreementId,
		// Display context (rentee/unit/property names) for the header.
		context = null,
		// Latest known config + meter readings for prefill. May be null/empty
		// for legacy agreements that never got a billing event written.
		initialConfig = null,
		initialMeterReadings = null,
		onCancel,
		onSaved
	} = $props();

	function normalizedConfig(raw) {
		if (!raw || typeof raw !== 'object') return defaultBillingConfig();
		const def = defaultBillingConfig();
		return {
			rent: raw.rent || def.rent,
			electricity: raw.electricity || def.electricity,
			water: raw.water || def.water,
			slt: raw.slt || def.slt
		};
	}

	let billing = $state(normalizedConfig(initialConfig));
	let effectiveFrom = $state(new Date().toISOString().slice(0, 10));
	let reason = $state('');
	let meterReadings = $state({
		electricity:
			initialMeterReadings?.electricity != null
				? Number(initialMeterReadings.electricity)
				: '',
		water:
			initialMeterReadings?.water != null ? Number(initialMeterReadings.water) : ''
	});

	let submitting = $state(false);
	let actionError = $state(null);

	function setElecMode(mode) {
		if (mode === 'fixed')           billing.electricity = { mode, fixed_lkr: 0 };
		else if (mode === 'unit_based') billing.electricity = { mode, rate: 0, initial_reading: 0 };
		else if (mode === 'solar_offset') billing.electricity = { mode, rate: 22, offset_units: 500, initial_reading: 0 };
		else                            billing.electricity = { mode };
	}
	function setWaterMode(mode) {
		if (mode === 'fixed')           billing.water = { mode, fixed_lkr: 0 };
		else if (mode === 'unit_based') billing.water = { mode, rate: 0, initial_reading: 0 };
		else                            billing.water = { mode };
	}
	function setSltMode(mode) {
		if (mode === 'fixed')           billing.slt = { mode, fixed_lkr: 0 };
		else                            billing.slt = { mode };
	}
	function setRentMode(mode) {
		billing.rent = { mode };
	}

	function onSubmit() {
		submitting = true;
		actionError = null;
		return async ({ result, update }) => {
			submitting = false;
			if (result.type === 'failure') {
				actionError = result.data?.error || 'Failed to save';
				await update({ reset: false });
				return;
			}
			await update({ reset: false });
			onSaved?.();
		};
	}

	const billingJson = $derived(JSON.stringify(billing));
	const meterReadingsJson = $derived(
		JSON.stringify(
			Object.fromEntries(
				Object.entries(meterReadings).filter(([_, v]) => v !== '' && v !== null && v != null)
			)
		)
	);
</script>

<aside class="editor" role="dialog" aria-label="Edit billing config">
	<header class="editor-header">
		<div class="editor-title">
			<Wallet class="h-4 w-4" />
			<div>
				<div class="editor-title-main">Edit billing</div>
				{#if context}
					<div class="editor-title-sub">
						{#if context.renteeName}{context.renteeName}{/if}
						{#if context.unitNumber}{#if context.renteeName} · {/if}Unit {context.unitNumber}{/if}
						{#if context.propertyName}{#if context.renteeName || context.unitNumber} · {/if}{context.propertyName}{/if}
					</div>
				{/if}
			</div>
		</div>
		<button type="button" class="editor-close" onclick={() => onCancel?.()} aria-label="Close">
			<X class="h-4 w-4" />
		</button>
	</header>

	{#if actionError}
		<div class="editor-error">{actionError}</div>
	{/if}

	<form
		method="POST"
		action="?/updateAgreementBilling"
		use:enhance={onSubmit}
		class="editor-body"
	>
		<input type="hidden" name="agreement_id" value={agreementId} />
		<input type="hidden" name="billing_config" value={billingJson} />
		<input type="hidden" name="meter_readings" value={meterReadingsJson} />

		<label class="field">
			<span><Calendar class="h-3 w-3" /> Effective from</span>
			<input type="date" name="effective_from" bind:value={effectiveFrom} required />
		</label>

		<label class="field">
			<span>Reason / note (optional)</span>
			<input
				type="text"
				name="reason"
				bind:value={reason}
				placeholder="e.g. switched to fixed rate at rentee request"
			/>
		</label>

		<p class="hint">
			Saving creates a new event in this agreement's billing history. Past invoices stay computed against the config that was active at their time.
		</p>

		<!-- Rent -->
		<div class="util-block">
			<header class="util-head">
				<span class="util-title">Rent</span>
				<select value={billing.rent.mode} onchange={(e) => setRentMode(e.currentTarget.value)}>
					<option value="fixed">Fixed (uses agreement rent)</option>
					<option value="client_managed">Tenant-managed</option>
				</select>
			</header>
		</div>

		<!-- Electricity -->
		<div class="util-block">
			<header class="util-head">
				<span class="util-title">Electricity</span>
				<select value={billing.electricity.mode} onchange={(e) => setElecMode(e.currentTarget.value)}>
					<option value="client_managed">Tenant-managed</option>
					<option value="fixed">Fixed monthly</option>
					<option value="unit_based">Metered (units × rate)</option>
					<option value="solar_offset">Solar offset (KIT-style)</option>
				</select>
			</header>
			{#if billing.electricity.mode === 'fixed'}
				<div class="util-fields">
					<label class="field"><span>Monthly LKR</span><input type="number" step="0.01" min="0" bind:value={billing.electricity.fixed_lkr} /></label>
				</div>
			{:else if billing.electricity.mode === 'unit_based'}
				<div class="util-fields">
					<label class="field"><span>LKR / unit</span><input type="number" step="0.01" min="0" bind:value={billing.electricity.rate} /></label>
					<label class="field"><span>Reading at change date</span><input type="number" step="0.1" min="0" bind:value={billing.electricity.initial_reading} /></label>
				</div>
			{:else if billing.electricity.mode === 'solar_offset'}
				<div class="util-fields">
					<label class="field"><span>LKR / unit</span><input type="number" step="0.01" min="0" bind:value={billing.electricity.rate} /></label>
					<label class="field"><span>Free unit allowance</span><input type="number" step="1" min="0" bind:value={billing.electricity.offset_units} /></label>
					<label class="field"><span>Reading at change date</span><input type="number" step="0.1" min="0" bind:value={billing.electricity.initial_reading} /></label>
				</div>
			{/if}
			{#if billing.electricity.mode === 'unit_based' || billing.electricity.mode === 'solar_offset'}
				<label class="field" style="margin-top: 8px;">
					<span>Current meter reading (snapshot for history)</span>
					<input type="number" step="0.1" min="0" bind:value={meterReadings.electricity} placeholder="optional" />
				</label>
			{/if}
		</div>

		<!-- Water -->
		<div class="util-block">
			<header class="util-head">
				<span class="util-title">Water</span>
				<select value={billing.water.mode} onchange={(e) => setWaterMode(e.currentTarget.value)}>
					<option value="client_managed">Tenant-managed</option>
					<option value="fixed">Fixed monthly</option>
					<option value="unit_based">Metered (units × rate)</option>
				</select>
			</header>
			{#if billing.water.mode === 'fixed'}
				<div class="util-fields">
					<label class="field"><span>Monthly LKR</span><input type="number" step="0.01" min="0" bind:value={billing.water.fixed_lkr} /></label>
				</div>
			{:else if billing.water.mode === 'unit_based'}
				<div class="util-fields">
					<label class="field"><span>LKR / unit</span><input type="number" step="0.01" min="0" bind:value={billing.water.rate} /></label>
					<label class="field"><span>Reading at change date</span><input type="number" step="0.1" min="0" bind:value={billing.water.initial_reading} /></label>
				</div>
				<label class="field" style="margin-top: 8px;">
					<span>Current meter reading (snapshot for history)</span>
					<input type="number" step="0.1" min="0" bind:value={meterReadings.water} placeholder="optional" />
				</label>
			{/if}
		</div>

		<!-- SLT -->
		<div class="util-block">
			<header class="util-head">
				<span class="util-title">Internet (SLT)</span>
				<select value={billing.slt.mode} onchange={(e) => setSltMode(e.currentTarget.value)}>
					<option value="none">Not applicable</option>
					<option value="passthrough">Pass-through</option>
					<option value="fixed">Fixed monthly</option>
					<option value="client_managed">Tenant-managed</option>
				</select>
			</header>
			{#if billing.slt.mode === 'fixed'}
				<div class="util-fields">
					<label class="field"><span>Monthly LKR</span><input type="number" step="0.01" min="0" bind:value={billing.slt.fixed_lkr} /></label>
				</div>
			{/if}
		</div>

		<footer class="editor-footer">
			<button type="button" class="ghost" onclick={() => onCancel?.()} disabled={submitting}>
				Cancel
			</button>
			<button type="submit" class="primary" disabled={submitting}>
				<Save class="h-4 w-4" /> {submitting ? 'Saving…' : 'Save changes'}
			</button>
		</footer>
	</form>
</aside>

<style>
	.editor {
		position: fixed;
		top: 0;
		right: 56px;
		bottom: 0;
		width: 420px;
		display: flex;
		flex-direction: column;
		background: hsl(var(--background) / 0.96);
		backdrop-filter: blur(10px);
		border-left: 1px solid hsl(var(--border));
		box-shadow: -16px 0 48px -16px hsl(0 0% 0% / 0.5);
		color: hsl(var(--foreground));
		z-index: 14;
		overflow: hidden;
	}
	.editor-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 14px;
		border-bottom: 1px solid hsl(var(--border));
	}
	.editor-title {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}
	.editor-title-main {
		font-size: 13px;
		font-weight: 600;
		color: hsl(var(--accent));
	}
	.editor-title-sub {
		margin-top: 2px;
		font-size: 11px;
		color: hsl(var(--foreground) / 0.85);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.editor-close {
		display: inline-flex;
		width: 28px;
		height: 28px;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		border: 1px solid transparent;
		background: transparent;
		color: hsl(var(--foreground) / 0.85);
		cursor: pointer;
	}
	.editor-close:hover {
		background: hsl(var(--card));
		color: hsl(var(--foreground));
	}

	.editor-error {
		margin: 8px 14px 0;
		padding: 7px 10px;
		background: hsl(var(--destructive) / 0.15);
		border: 1px solid hsl(var(--destructive) / 0.4);
		border-radius: 8px;
		color: hsl(var(--destructive));
		font-size: 12px;
	}

	.editor-body {
		flex: 1;
		overflow-y: auto;
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.field > span {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: hsl(var(--muted-foreground));
	}
	.field input,
	.field select {
		padding: 7px 10px;
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		color: hsl(var(--foreground));
		font-size: 12.5px;
		font-family: inherit;
		outline: none;
	}
	.field input:focus,
	.field select:focus {
		border-color: hsl(var(--accent) / 0.6);
	}

	.hint {
		margin: 0;
		padding: 8px 10px;
		font-size: 11px;
		color: hsl(var(--muted-foreground));
		background: hsl(var(--card) / 0.4);
		border: 1px dashed hsl(var(--border));
		border-radius: 8px;
	}

	.util-block {
		padding: 10px 12px;
		background: hsl(var(--card) / 0.5);
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
	}
	.util-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}
	.util-title {
		font-size: 12.5px;
		font-weight: 600;
		color: hsl(var(--foreground));
	}
	.util-head select {
		padding: 5px 8px;
		background: hsl(var(--background));
		border: 1px solid hsl(var(--border));
		border-radius: 6px;
		color: hsl(var(--foreground));
		font-size: 12px;
		font-family: inherit;
	}
	.util-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-top: 10px;
	}

	.editor-footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding-top: 10px;
		border-top: 1px solid hsl(var(--border));
	}
	.editor-footer button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 12px;
		font-size: 12.5px;
		font-weight: 600;
		border-radius: 8px;
		cursor: pointer;
		font-family: inherit;
	}
	.editor-footer .ghost {
		background: transparent;
		color: hsl(var(--foreground) / 0.85);
		border: 1px solid hsl(var(--border));
	}
	.editor-footer .ghost:hover:not(:disabled) {
		background: hsl(var(--card));
		color: hsl(var(--foreground));
	}
	.editor-footer .primary {
		background: hsl(var(--accent));
		color: hsl(var(--background));
		border: 1px solid hsl(var(--accent));
	}
	.editor-footer .primary:hover:not(:disabled) {
		filter: brightness(1.08);
	}
	.editor-footer button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
